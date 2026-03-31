import {
  Body,
  Controller,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiForbiddenResponse, ApiNotFoundResponse, ApiOkResponse, ApiOperation, ApiParam, ApiBody, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '../auth/auth.guard';
import { CampagnesService } from './campagnes.service';
import { ModererCampagneDto } from './dto/moderer-campagne.dto';

@ApiTags('Campagnes (admin)')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller('campagnes')
export class CampagnesController {
  constructor(private readonly campagnesService: CampagnesService) {}

  /**
   * Story 8 / RG6 — Modération d'une campagne (admin seulement).
   * La campagne doit être EN_ATTENTE (soumise par le porteur).
   * ACCEPTEE → ACTIVE  |  REFUSEE → REFUSEE
   */
  @Patch(':id/moderer')
  @ApiOperation({
    summary: 'Modérer une campagne (Story 8)',
    description:
      'Accessible aux administrateurs uniquement. ' +
      'Accepte ou refuse une campagne en attente de modération.',
  })
  @ApiParam({ name: 'id', type: String, description: 'UUID de la campagne à modérer' })
  @ApiBody({ type: ModererCampagneDto })
  @ApiOkResponse({ description: 'Campagne modérée avec succès' })
  @ApiForbiddenResponse({ description: 'Non administrateur ou campagne pas EN_ATTENTE' })
  @ApiNotFoundResponse({ description: 'Campagne introuvable' })
  async moderer(
    @Param('id') id: string,
    @Body() dto: ModererCampagneDto,
    @Req() req: any,
  ) {
    return this.campagnesService.moderer(
      id,
      dto.decision,
      req.user?.role,
      req.headers?.authorization,
    );
  }

  @Post(':id/soumettre')
  @ApiOperation({ summary: 'Soumettre une campagne (Story 8)', description: 'Permet au porteur de soumettre sa campagne BROUILLON pour modération (→ EN_ATTENTE).' })
  @ApiParam({ name: 'id', type: String, description: 'UUID de la campagne à soumettre' })
  @ApiOkResponse({ description: 'Campagne soumise avec succès' })
  @ApiForbiddenResponse({ description: 'Non autorisé à soumettre cette campagne' })
  @ApiNotFoundResponse({ description: 'Campagne introuvable' })
  async soumettre(@Param('id') id: string, @Req() req: any) {
    return this.campagnesService.soumettre(id, req.user?.role, req.headers?.authorization);
  }
}
