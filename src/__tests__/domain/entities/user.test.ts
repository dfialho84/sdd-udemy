// Testes da entidade User — domínio puro
// Rastreabilidade: T-01 · REQ-1 · REQ-8

import { User, UserProps } from "@/domain/entities/user";

const baseProps: UserProps = {
  id: "550e8400-e29b-41d4-a716-446655440000",
  name: "Maria Silva",
  email: "maria@example.com",
  passwordHash: "$argon2id$v=19$m=65536,t=3,p=2$hash",
  birthDate: new Date("1990-01-01"),
  avatarUrl: null,
  status: "pending",
  createdAt: new Date("2024-01-01T00:00:00Z"),
  updatedAt: new Date("2024-01-01T00:00:00Z"),
};

describe("User entity", () => {
  it("deve ser instanciado com todos os campos obrigatórios", () => {
    const user = new User(baseProps);

    expect(user.id).toBe(baseProps.id);
    expect(user.name).toBe(baseProps.name);
    expect(user.email).toBe(baseProps.email);
    expect(user.passwordHash).toBe(baseProps.passwordHash);
    expect(user.birthDate).toEqual(baseProps.birthDate);
    expect(user.avatarUrl).toBeNull();
    expect(user.status).toBe("pending");
    expect(user.createdAt).toEqual(baseProps.createdAt);
    expect(user.updatedAt).toEqual(baseProps.updatedAt);
  });

  it("deve aceitar avatarUrl quando fornecido", () => {
    const user = new User({ ...baseProps, avatarUrl: "https://example.com/avatar.png" });
    expect(user.avatarUrl).toBe("https://example.com/avatar.png");
  });

  it("isPending() deve retornar true quando status é pending", () => {
    const user = new User({ ...baseProps, status: "pending" });
    expect(user.isPending()).toBe(true);
    expect(user.isActive()).toBe(false);
  });

  it("isActive() deve retornar true quando status é active", () => {
    const user = new User({ ...baseProps, status: "active" });
    expect(user.isActive()).toBe(true);
    expect(user.isPending()).toBe(false);
  });
});
