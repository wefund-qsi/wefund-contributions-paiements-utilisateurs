import {
  Body,
  Controller,
  Param,
  Patch,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiForbiddenResponse, ApiNotFoundResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
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
}
