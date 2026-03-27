import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Body,
  Param,
  Request,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Request as ExpressRequest } from 'express';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';
import { ContributionService } from './contribution.service';
import { CreateContributionDto } from './dtos/create-contribution.dto';
import { UpdateContributionDto } from './dtos/update-contribution.dto';
import { AuthGuard } from '../auth/auth.guard';

interface AuthenticatedRequest extends ExpressRequest {
  user: { sub: string; username: string; role: string };
}

@ApiTags('Contributions')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller('contribution')
export class ContributionController {
  constructor(private readonly contributionService: ContributionService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Financer une campagne (Story 1)', description: 'Crée une contribution vers une campagne active (RG1, RG2, RG3).' })
  @ApiBody({ type: CreateContributionDto })
  @ApiResponse({ status: 201, description: 'Contribution créée.' })
  @ApiResponse({ status: 400, description: 'Campagne inactive ou données invalides.' })
  @ApiResponse({ status: 404, description: 'Campagne ou utilisateur introuvable.' })
  async create(@Request() req: AuthenticatedRequest, @Body() dto: CreateContributionDto) {
    const contribution = await this.contributionService.create(req.user.sub, dto);
    return {
      statusCode: HttpStatus.CREATED,
      message: 'Contribution créée avec succès',
      data: contribution,
      timestamp: new Date().toISOString(),
    };
  }

  @Get()
  @ApiOperation({ summary: 'Mes contributions (Story 2)', description: "Retourne toutes les contributions de l'utilisateur connecté." })
  @ApiResponse({ status: 200, description: 'Liste des contributions.' })
  async findAll(@Request() req: AuthenticatedRequest) {
    const contributions = await this.contributionService.findAllByUser(req.user.sub);
    return {
      statusCode: HttpStatus.OK,
      message: 'Contributions récupérées avec succès',
      data: contributions,
      timestamp: new Date().toISOString(),
    };
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Modifier le montant (Story 5)', description: "Met à jour le montant d'une contribution. Campagne doit être active (RG3)." })
  @ApiParam({ name: 'id', type: String, description: 'UUID de la contribution' })
  @ApiBody({ type: UpdateContributionDto })
  @ApiResponse({ status: 200, description: 'Contribution mise à jour.' })
  @ApiResponse({ status: 400, description: 'Campagne inactive.' })
  @ApiResponse({ status: 403, description: 'Pas votre contribution.' })
  async update(
    @Request() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() dto: UpdateContributionDto,
  ) {
    const contribution = await this.contributionService.update(req.user.sub, id, dto);
    return {
      statusCode: HttpStatus.OK,
      message: 'Contribution mise à jour avec succès',
      data: contribution,
      timestamp: new Date().toISOString(),
    };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Demander un remboursement (Story 4)', description: 'Annule une contribution. Campagne doit être active (RG3).' })
  @ApiParam({ name: 'id', type: String, description: 'UUID de la contribution' })
  @ApiResponse({ status: 200, description: 'Contribution annulée.' })
  @ApiResponse({ status: 400, description: 'Campagne inactive.' })
  @ApiResponse({ status: 403, description: 'Pas votre contribution.' })
  async remove(@Request() req: AuthenticatedRequest, @Param('id') id: string) {
    await this.contributionService.remove(req.user.sub, id);
    return {
      statusCode: HttpStatus.OK,
      message: 'Contribution annulée avec succès',
      timestamp: new Date().toISOString(),
    };
  }
}
