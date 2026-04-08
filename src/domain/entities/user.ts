// Entidade User — camada domain
// Rastreabilidade: REQ-1 · REQ-2 · REQ-8 · T-01

export type UserStatus = "pending" | "active";

export interface UserProps {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  birthDate: Date;
  /** Object key do MinIO no formato `avatars/<uuid>.<ext>`, ou null quando não há avatar. */
  avatarKey: string | null;
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
  /** Object key do MinIO no formato `avatars/<uuid>.<ext>`, ou null quando não há avatar. */
  readonly avatarKey: string | null;
  readonly status: UserStatus;
  readonly createdAt: Date;
  readonly updatedAt: Date;

  constructor(props: UserProps) {
    this.id = props.id;
    this.name = props.name;
    this.email = props.email;
    this.passwordHash = props.passwordHash;
    this.birthDate = props.birthDate;
    this.avatarKey = props.avatarKey;
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
