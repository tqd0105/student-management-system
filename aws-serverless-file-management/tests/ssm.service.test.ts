import { describe, it, expect, beforeEach } from "vitest";
import { mockClient } from "aws-sdk-client-mock";
import {
  SSMClient,
  GetParameterCommand,
  GetParametersByPathCommand,
  PutParameterCommand,
  DeleteParameterCommand,
} from "@aws-sdk/client-ssm";
import {
  getParameter,
  getParametersByPath,
  putParameter,
  deleteParameter,
} from "../src/services/ssm.service.js";

const ssmMock = mockClient(SSMClient);

describe("SSM Parameter Store Service", () => {
  beforeEach(() => {
    ssmMock.reset();
  });

  describe("getParameter", () => {
    it("should return parameter value when found", async () => {
      ssmMock.on(GetParameterCommand).resolves({
        Parameter: {
          Name: "/sms/dev/jwt-secret",
          Value: "decrypted-secret-value",
          Type: "SecureString",
        },
      });

      const value = await getParameter("/sms/dev/jwt-secret", true);
      expect(value).toBe("decrypted-secret-value");
    });

    it("should return null when parameter not found", async () => {
      const err = new Error("Parameter not found");
      err.name = "ParameterNotFound";
      ssmMock.on(GetParameterCommand).rejects(err);

      const value = await getParameter("/sms/dev/missing");
      expect(value).toBeNull();
    });
  });

  describe("getParametersByPath", () => {
    it("should return key-value map for parameters under path prefix", async () => {
      ssmMock.on(GetParametersByPathCommand).resolves({
        Parameters: [
          { Name: "/sms/dev/s3-bucket", Value: "my-bucket" },
          { Name: "/sms/dev/jwt-secret", Value: "my-secret" },
        ],
      });

      const params = await getParametersByPath("/sms/dev/");
      expect(params).toEqual({
        "s3-bucket": "my-bucket",
        "jwt-secret": "my-secret",
      });
    });
  });

  describe("putParameter", () => {
    it("should put standard String parameter", async () => {
      ssmMock.on(PutParameterCommand).resolves({ Version: 1 });

      const version = await putParameter(
        "/sms/dev/api-url",
        "https://api.example.com",
        false,
        "API Base URL",
      );
      expect(version).toBe(1);
    });

    it("should put SecureString parameter with KMS encryption", async () => {
      ssmMock.on(PutParameterCommand).resolves({ Version: 2 });

      const version = await putParameter(
        "/sms/dev/jwt-secret",
        "super-secret-key",
        true,
        "JWT Secret Key encrypted with KMS",
      );
      expect(version).toBe(2);
    });
  });

  describe("deleteParameter", () => {
    it("should delete parameter successfully", async () => {
      ssmMock.on(DeleteParameterCommand).resolves({});

      await expect(deleteParameter("/sms/dev/temp")).resolves.toBeUndefined();
    });

    it("should handle ParameterNotFound gracefully without throwing", async () => {
      const err = new Error("Parameter not found");
      err.name = "ParameterNotFound";
      ssmMock.on(DeleteParameterCommand).rejects(err);

      await expect(deleteParameter("/sms/dev/nonexistent")).resolves.toBeUndefined();
    });
  });
});
