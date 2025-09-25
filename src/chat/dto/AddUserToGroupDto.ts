import { IsString } from 'class-validator';

export class AddUserToGroupDto {
  @IsString()
  userId: string;
}
