import axios from "axios";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getMe, login, logout } from "./api";

vi.mock("axios", () => {
  const instance = { get: vi.fn(), post: vi.fn(), defaults: {} };
  return { default: { create: vi.fn(() => instance) } };
});

const mockedInstance = (
  axios.create as unknown as () => {
    get: ReturnType<typeof vi.fn>;
    post: ReturnType<typeof vi.fn>;
  }
)();

describe("api client", () => {
  beforeEach(() => {
    mockedInstance.get.mockReset();
    mockedInstance.post.mockReset();
  });

  it("login mengirim POST /auth/login dan mengembalikan user", async () => {
    mockedInstance.post.mockResolvedValueOnce({
      data: { user: { user_id: "u1", role: "owner" } },
    });
    const result = await login("a@b.com", "secret");
    expect(mockedInstance.post).toHaveBeenCalledWith("/auth/login", {
      email: "a@b.com",
      password: "secret",
    });
    expect(result.user.role).toBe("owner");
  });

  it("getMe mengirim GET /auth/me", async () => {
    mockedInstance.get.mockResolvedValueOnce({
      data: { user: { user_id: "u1", role: "tentor" } },
    });
    const user = await getMe();
    expect(mockedInstance.get).toHaveBeenCalledWith("/auth/me");
    expect(user.role).toBe("tentor");
  });

  it("logout mengirim POST /auth/logout", async () => {
    mockedInstance.post.mockResolvedValueOnce({ data: {} });
    await logout();
    expect(mockedInstance.post).toHaveBeenCalledWith("/auth/logout");
  });
});
