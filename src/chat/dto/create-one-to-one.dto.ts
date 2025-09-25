import { IsUUID, IsString, IsOptional } from 'class-validator';

export class CreateOneToOneChatDto {
  @IsUUID()
  userA: string;

  @IsString()
  chatName: string;

  @IsString()
  @IsOptional()
  key: string;
}
