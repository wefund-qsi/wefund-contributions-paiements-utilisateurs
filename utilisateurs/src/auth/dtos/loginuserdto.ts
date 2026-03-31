import { IsString, IsNotEmpty } from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'

export class LoginUserDto {
    @ApiProperty({ example: 'jdupont', description: 'Nom d\'utilisateur' })
    @IsString()
    @IsNotEmpty()
    username: string

    @ApiProperty({ example: 'motdepasse123', description: 'Mot de passe' })
    @IsString()
    @IsNotEmpty()
    password: string
}
