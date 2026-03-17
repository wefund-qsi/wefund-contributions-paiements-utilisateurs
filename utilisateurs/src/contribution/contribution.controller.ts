import {
    Controller,
    Post,
    Get,
    Patch,
    Delete,
    Body,
    Param,
    ParseIntPipe,
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

interface AuthenticatedRequest extends ExpressRequest {
    user: { sub: string; username: string; role: string };
}
import { ContributionService } from './contribution.service';
import { CreateContributionDto } from './dtos/create-contribution.dto';
import { UpdateContributionDto } from './dtos/update-contribution.dto';
import { AuthGuard } from '../auth/auth.guard';

@ApiTags('Contribution')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller('contribution')
export class ContributionController {
    constructor(private readonly contributionService: ContributionService) {}

    @Post()
    @HttpCode(HttpStatus.CREATED)
    @ApiOperation({ summary: 'Créer une contribution', description: 'Contribue à une campagne active. La campagne doit avoir le statut "active".' })
    @ApiBody({ type: CreateContributionDto })
    @ApiResponse({ status: 201, description: 'Contribution créée avec succès.' })
    @ApiResponse({ status: 400, description: 'Campagne inactive ou données invalides.' })
    @ApiResponse({ status: 401, description: 'Token JWT manquant ou invalide.' })
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
    @ApiOperation({ summary: 'Lister mes contributions', description: "Retourne toutes les contributions de l'utilisateur connecté avec les infos campagne et projet." })
    @ApiResponse({ status: 200, description: 'Liste des contributions récupérée.' })
    @ApiResponse({ status: 401, description: 'Token JWT manquant ou invalide.' })
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
    @ApiOperation({ summary: "Modifier le montant d'une contribution", description: "Met à jour le montant d'une contribution. Seul le propriétaire peut modifier. La campagne doit être active." })
    @ApiParam({ name: 'id', type: Number, description: 'ID de la contribution' })
    @ApiBody({ type: UpdateContributionDto })
    @ApiResponse({ status: 200, description: 'Contribution mise à jour.' })
    @ApiResponse({ status: 400, description: 'Campagne inactive ou montant invalide.' })
    @ApiResponse({ status: 401, description: 'Token JWT manquant ou invalide.' })
    @ApiResponse({ status: 403, description: 'Vous ne pouvez modifier que vos propres contributions.' })
    @ApiResponse({ status: 404, description: 'Contribution introuvable.' })
    async update(
        @Request() req: AuthenticatedRequest,
        @Param('id', ParseIntPipe) id: number,
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
    @ApiOperation({ summary: 'Annuler une contribution', description: 'Supprime une contribution. Seul le propriétaire peut annuler. La campagne doit être active.' })
    @ApiParam({ name: 'id', type: Number, description: 'ID de la contribution' })
    @ApiResponse({ status: 200, description: 'Contribution annulée.' })
    @ApiResponse({ status: 400, description: 'Campagne inactive, annulation impossible.' })
    @ApiResponse({ status: 401, description: 'Token JWT manquant ou invalide.' })
    @ApiResponse({ status: 403, description: 'Vous ne pouvez annuler que vos propres contributions.' })
    @ApiResponse({ status: 404, description: 'Contribution introuvable.' })
    async remove(@Request() req: AuthenticatedRequest, @Param('id', ParseIntPipe) id: number) {
        await this.contributionService.remove(req.user.sub, id);
        return {
            statusCode: HttpStatus.OK,
            message: 'Contribution annulée avec succès',
            timestamp: new Date().toISOString(),
        };
    }
}
