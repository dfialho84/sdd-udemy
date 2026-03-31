// Entidade User — camada domain
// Rastreabilidade: REQ-1 · REQ-8 · T-01

export type UserStatus = "pending" | "active";

export interface UserProps {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  birthDate: Date;
  avatarUrl: string | null;
  status: UserStatus;
  createdAt: Date;
  updatedAt: Date;
}

export class User {
  readonly id: string;
  readonly name: string;
  readonly email: string;
  readonly passwordHash: string;
  readonly birthDate: Date;
  readonly avatarUrl: string | null;
  readonly status: UserStatus;
  readonly createdAt: Date;
  readonly updatedAt: Date;

  constructor(props: UserProps) {
    this.id = props.id;
    this.name = props.name;
    this.email = props.email;
    this.passwordHash = props.passwordHash;
    this.birthDate = props.birthDate;
    this.avatarUrl = props.avatarUrl;
    this.status = props.status;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }

  isPending(): boolean {
    return this.status === "pending";
  }

  isActive(): boolean {
    return this.status === "active";
  }
}
