export class LoginDto {
  username!: string;
  password!: string;
}

export class ChangePasswordDto {
  current_password!: string;
  new_password!: string;
  username?: string;
}

export class UpdateProfileDto {
  display_name!: string;
}
