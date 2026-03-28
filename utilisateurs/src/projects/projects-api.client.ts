import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { AxiosError } from 'axios';
import { firstValueFrom } from 'rxjs';

export type CampagneStatut =
  | 'BROUILLON'
  | 'EN_ATTENTE'
  | 'ACTIVE'
  | 'REUSSIE'
  | 'ECHOUEE'
  | 'REFUSEE';

export interface CampagneDetails {
  id: string;
  statut: CampagneStatut | string;
  idPorteur?: string;
  idProjet?: string;
}

@Injectable()
export class ProjectsApiClient {
  private readonly logger = new Logger(ProjectsApiClient.name);
  private readonly baseUrl: string;
  private readonly timeoutMs: number;
  private readonly moderationPath: string;
  private readonly moderationFallbackPath?: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.baseUrl = (this.configService.get<string>('PROJECTS_API_BASE_URL') || 'http://localhost:3000/api').replace(/\/$/, '');
    this.timeoutMs = Number(this.configService.get<string>('PROJECTS_API_TIMEOUT_MS') || 5000);
    this.moderationPath = this.configService.get<string>('PROJECTS_MODERATION_PATH') || '/campagnes/:id/moderer';
    this.moderationFallbackPath = this.configService.get<string>('PROJECTS_MODERATION_FALLBACK_PATH') || '/campagnes/:id';
    this.logger.log(`[ProjectsApi] baseUrl=${this.baseUrl} timeoutMs=${this.timeoutMs}`);
  }

  async getCampagneById(campagneId: string): Promise<CampagneDetails> {
    try {
      const { data } = await firstValueFrom(
        this.httpService.get<CampagneDetails>(`${this.baseUrl}/campagnes/${campagneId}`, {
          timeout: this.timeoutMs,
        }),
      );
      return data;
    } catch (error) {
      this.throwMappedHttpError(error, `Lecture campagne ${campagneId}`);
    }
  }

  async modererCampagne(
    campagneId: string,
    decision: 'ACCEPTEE' | 'REFUSEE',
    authorizationHeader?: string,
  ): Promise<{ id: string; statut: CampagneStatut | string }> {
    try {
      const path = this.resolvePath(this.moderationPath, campagneId);
      const headers = authorizationHeader ? { Authorization: authorizationHeader } : undefined;
      const { data } = await firstValueFrom(
        this.httpService.patch<{ id: string; statut: CampagneStatut | string }>(
          `${this.baseUrl}${path}`,
          { decision },
          {
            headers,
            timeout: this.timeoutMs,
          },
        ),
      );
      return data;
    } catch (error) {
      if (this.shouldTryModerationFallback(error) && this.moderationFallbackPath) {
        return this.tryModerationFallback(campagneId, decision, authorizationHeader);
      }
      this.throwMappedHttpError(error, `Moderation campagne ${campagneId}`);
    }
  }

  private async tryModerationFallback(
    campagneId: string,
    decision: 'ACCEPTEE' | 'REFUSEE',
    authorizationHeader?: string,
  ): Promise<{ id: string; statut: CampagneStatut | string }> {
    try {
      const path = this.resolvePath(this.moderationFallbackPath!, campagneId);
      const headers = authorizationHeader ? { Authorization: authorizationHeader } : undefined;
      this.logger.warn(`[ProjectsApi] route de moderation principale indisponible, tentative fallback ${path}`);
      const { data } = await firstValueFrom(
        this.httpService.patch<{ id: string; statut: CampagneStatut | string }>(
          `${this.baseUrl}${path}`,
          { decision },
          {
            headers,
            timeout: this.timeoutMs,
          },
        ),
      );
      return data;
    } catch (error) {
      this.throwMappedHttpError(error, `Moderation fallback campagne ${campagneId}`);
    }
  }

  private throwMappedHttpError(error: unknown, context: string): never {
    const axiosError = error as AxiosError<{ message?: string | string[] }>;
    const status = axiosError.response?.status;
    const message = this.extractMessage(axiosError.response?.data?.message);

    if (!status) {
      this.logger.error(`[ProjectsApi] ${context} - service indisponible ou timeout`);
      throw new ServiceUnavailableException('Service Projets indisponible ou timeout');
    }

    switch (status) {
      case 400:
        throw new BadRequestException(message || 'Requete invalide vers le service Projets');
      case 401:
        throw new UnauthorizedException(message || 'Authentification requise');
      case 403:
        throw new ForbiddenException(message || 'Acces refuse');
      case 404:
        throw new NotFoundException(message || 'Ressource campagne introuvable');
      default:
        this.logger.error(`[ProjectsApi] ${context} - status=${status}`);
        throw new ServiceUnavailableException('Erreur de communication avec le service Projets');
    }
  }

  private extractMessage(message: string | string[] | undefined): string | undefined {
    if (Array.isArray(message)) {
      return message.join(', ');
    }
    return message;
  }

  private resolvePath(pathTemplate: string, campagneId: string): string {
    const path = pathTemplate.replace(':id', campagneId);
    return path.startsWith('/') ? path : `/${path}`;
  }

  private shouldTryModerationFallback(error: unknown): boolean {
    const axiosError = error as AxiosError<{ message?: string | string[] }>;
    const status = axiosError.response?.status;
    const message = this.extractMessage(axiosError.response?.data?.message) || '';
    return status === 404 && message.toLowerCase().includes('cannot patch');
  }
}
