import { IsEmail, IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

export class TransferSuperAdminDto {
  @IsEmail({}, { message: 'newEmail must be a valid email address' })
  @IsNotEmpty({ message: 'newEmail should not be empty' })
  newEmail: string;

  @IsString({ message: 'newPassword must be a string' })
  @IsNotEmpty({ message: 'newPassword should not be empty' })
  @MinLength(8, { message: 'newPassword must be at least 8 characters long' })
  @MaxLength(72, { message: 'newPassword must be shorter than or equal to 72 characters' })
  newPassword: string;

  @IsString({ message: 'confirmPassword must be a string' })
  @IsNotEmpty({ message: 'confirmPassword should not be empty' })
  confirmPassword: string;
}
