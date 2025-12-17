/* eslint-disable @typescript-eslint/require-await, require-await, sonarjs/prefer-single-boolean-return */
export type User = {
  id: string;
  username: string;
  roles: string[];
  tenant?: string;
  metadata?: Record<string, unknown>;
};

export type Permission = {
  resource: string;
  action: string;
  conditions?: Record<string, unknown>;
};

export type Role = {
  name: string;
  permissions: Permission[];
  description?: string;
};

export type AuthProvider = {
  authenticate(token: string): Promise<User>;
  authorize(user: User, permission: Permission): Promise<boolean>;
};

export class RBACAuthProvider implements AuthProvider {
  private readonly roles: Map<string, Role> = new Map();

  constructor(roles: Role[] = []) {
    // Initialize default roles
    this.initializeDefaultRoles();

    // Override with provided roles
    for (const role of roles) {
      this.roles.set(role.name, role);
    }
  }

  private initializeDefaultRoles(): void {
    this.roles.set("admin", {
      name: "admin",
      description: "Full access to all resources",
      permissions: [
        {
          resource: "*",
          action: "*",
        },
      ],
    });

    this.roles.set("editor", {
      name: "editor",
      description: "Can modify environments and secrets",
      permissions: [
        { resource: "environment", action: "read" },
        { resource: "environment", action: "write" },
        { resource: "environment", action: "delete" },
        { resource: "secret", action: "read" },
        { resource: "secret", action: "write" },
      ],
    });

    this.roles.set("viewer", {
      name: "viewer",
      description: "Read-only access to environments and secrets",
      permissions: [
        { resource: "environment", action: "read" },
        { resource: "secret", action: "read" },
      ],
    });
  }

  async authenticate(token: string): Promise<User> {
    // TODO: Implement actual JWT or token validation
    // For now, parse a simple token format: userId:username:roles
    const parts = token.split(":");
    if (parts.length < 3) {
      throw new Error("Invalid token format");
    }

    const userId = parts[0];
    const username = parts[1];
    const rolesString = parts[2];
    if (!userId || !username || !rolesString) {
      throw new Error("Invalid token: missing required fields");
    }
    const roles = rolesString.split(",");

    const tenant = parts[3];

    return {
      id: userId,
      username,
      roles,
      ...(tenant && { tenant }),
    };
  }

  async authorize(user: User, permission: Permission): Promise<boolean> {
    // Check if user has admin role (full access)
    if (user.roles.includes("admin")) {
      return true;
    }

    // Check specific permissions for each role
    return user.roles.some((roleName) => {
      const role = this.roles.get(roleName);
      if (!role) {
        return false;
      }

      return role.permissions.some((rolePermission) =>
        this.matchesPermission(rolePermission, permission),
      );
    });
  }

  private matchesPermission(
    rolePermission: Permission,
    requestedPermission: Permission,
  ): boolean {
    // Check resource match (support wildcards)
    if (
      rolePermission.resource !== "*" &&
      rolePermission.resource !== requestedPermission.resource
    ) {
      return false;
    }

    // Check action match (support wildcards)
    if (
      rolePermission.action !== "*" &&
      rolePermission.action !== requestedPermission.action
    ) {
      return false;
    }

    // TODO: Check conditions if present
    return true;
  }

  addRole(role: Role): void {
    this.roles.set(role.name, role);
  }

  getRole(name: string): Role | undefined {
    return this.roles.get(name);
  }

  listRoles(): Role[] {
    return Array.from(this.roles.values());
  }
}

export class JWTAuthProvider implements AuthProvider {
  constructor(
    private readonly config: {
      secretKey: string;
      issuer?: string;
      audience?: string;
    },
  ) {
    // Mark config as used
    void this.config;
  }

  async authenticate(_token: string): Promise<User> {
    // TODO: Implement actual JWT verification
    // For now, return a mock user
    return Promise.resolve({
      id: "user-123",
      username: "test-user",
      roles: ["viewer"],
      tenant: "default",
    });
  }

  async authorize(user: User, permission: Permission): Promise<boolean> {
    // Delegate to RBAC logic
    const rbacProvider = new RBACAuthProvider();
    return await rbacProvider.authorize(user, permission);
  }
}
