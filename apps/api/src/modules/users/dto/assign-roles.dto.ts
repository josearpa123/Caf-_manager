import { ArrayNotEmpty, IsArray, IsString } from 'class-validator';

export class AssignRolesDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  roleIds: string[];
}
