interface CredentialsType {
    email: string;
    name: string;
    profilePicture?: File | undefined;
    password: string;
}

export type RegisterCredentials = Pick<CredentialsType, "email" | "name" | "profilePicture" | "password">;

export type LoginCredentials = Pick<CredentialsType, "email" | "password">;

export interface User {
    id: string;
    email: string;
    name?: string;
    profilePicture?: string;
    phoneNumber?: string;
    dateOfBirth?: string;
    currency?: string;
    country?: string;
    timezone?: string;
}

export interface AuthResponse {
    accessToken: string;
    refreshToken: string;
    user: User;
}
