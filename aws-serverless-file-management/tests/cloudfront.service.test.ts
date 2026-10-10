import { describe, it, expect, beforeEach } from "vitest";
import { mockClient } from "aws-sdk-client-mock";
import {
  CloudFrontClient,
  CreateDistributionCommand,
  CreateInvalidationCommand,
  CreateOriginAccessControlCommand,
  GetDistributionCommand,
  ListDistributionsCommand,
  ListOriginAccessControlsCommand,
} from "@aws-sdk/client-cloudfront";
import {
  getCloudFrontUrl,
  createOrGetOriginAccessControl,
  createOrGetDistribution,
  getDistribution,
  createInvalidation,
} from "../src/services/cloudfront.service.js";

const cloudFrontMock = mockClient(CloudFrontClient);

describe("CloudFront CDN Service", () => {
  beforeEach(() => {
    cloudFrontMock.reset();
  });

  describe("getCloudFrontUrl", () => {
    it("should format valid CloudFront URL correctly", () => {
      const url = getCloudFrontUrl("avatars/user-1.jpg", "d123456abcdef.cloudfront.net");
      expect(url).toBe("https://d123456abcdef.cloudfront.net/avatars/user-1.jpg");
    });

    it("should strip leading slash from object key", () => {
      const url = getCloudFrontUrl("/avatars/user-2.png", "d123456abcdef.cloudfront.net");
      expect(url).toBe("https://d123456abcdef.cloudfront.net/avatars/user-2.png");
    });

    it("should throw error if domain is empty", () => {
      expect(() => getCloudFrontUrl("test.jpg", "")).toThrow(
        "CloudFront domain is not configured",
      );
    });
  });

  describe("createOrGetOriginAccessControl", () => {
    it("should return existing OAC if it already exists", async () => {
      cloudFrontMock.on(ListOriginAccessControlsCommand).resolves({
        OriginAccessControlList: {
          Items: [
            {
              Id: "OAC123456",
              Name: "s3-file-storage-oac",
            },
          ],
        },
      });

      const result = await createOrGetOriginAccessControl("s3-file-storage-oac");
      expect(result.id).toBe("OAC123456");
      expect(result.name).toBe("s3-file-storage-oac");
    });

    it("should create new OAC if it does not exist", async () => {
      cloudFrontMock.on(ListOriginAccessControlsCommand).resolves({
        OriginAccessControlList: {
          Items: [],
        },
      });

      cloudFrontMock.on(CreateOriginAccessControlCommand).resolves({
        OriginAccessControl: {
          Id: "NEW_OAC_987",
          OriginAccessControlConfig: {
            Name: "s3-new-oac",
            Description: "New OAC",
            OriginAccessControlOriginType: "s3",
            SigningBehavior: "always",
            SigningProtocol: "sigv4",
          },
        },
      });

      const result = await createOrGetOriginAccessControl("s3-new-oac", "New OAC");
      expect(result.id).toBe("NEW_OAC_987");
      expect(result.name).toBe("s3-new-oac");
    });
  });

  describe("createOrGetDistribution", () => {
    it("should return existing distribution if already created for S3 bucket", async () => {
      const s3Domain = "test-bucket.s3.ap-southeast-1.amazonaws.com";

      cloudFrontMock.on(ListDistributionsCommand).resolves({
        DistributionList: {
          Items: [
            {
              Id: "DIST123",
              DomainName: "dexisting.cloudfront.net",
              Status: "Deployed",
              Origins: {
                Quantity: 1,
                Items: [
                  {
                    Id: "S3-test-bucket",
                    DomainName: s3Domain,
                  },
                ],
              },
            },
          ],
        },
      });

      const result = await createOrGetDistribution({
        bucketName: "test-bucket",
        bucketRegion: "ap-southeast-1",
        oacId: "OAC123",
      });

      expect(result.distributionId).toBe("DIST123");
      expect(result.domainName).toBe("dexisting.cloudfront.net");
      expect(result.status).toBe("Deployed");
    });

    it("should create a new distribution if none exists for S3 bucket", async () => {
      cloudFrontMock.on(ListDistributionsCommand).resolves({
        DistributionList: { Items: [] },
      });

      cloudFrontMock.on(CreateDistributionCommand).resolves({
        Distribution: {
          Id: "NEW_DIST_999",
          DomainName: "dnewdomain.cloudfront.net",
          Status: "InProgress",
        },
      });

      const result = await createOrGetDistribution({
        bucketName: "test-bucket",
        bucketRegion: "ap-southeast-1",
        oacId: "OAC123",
      });

      expect(result.distributionId).toBe("NEW_DIST_999");
      expect(result.domainName).toBe("dnewdomain.cloudfront.net");
      expect(result.status).toBe("InProgress");
    });
  });

  describe("getDistribution", () => {
    it("should retrieve distribution details", async () => {
      cloudFrontMock.on(GetDistributionCommand).resolves({
        Distribution: {
          Id: "DIST123",
          DomainName: "d123.cloudfront.net",
          Status: "Deployed",
        },
      });

      const dist = await getDistribution("DIST123");
      expect(dist.id).toBe("DIST123");
      expect(dist.domainName).toBe("d123.cloudfront.net");
      expect(dist.status).toBe("Deployed");
    });
  });

  describe("createInvalidation", () => {
    it("should create cache invalidation successfully", async () => {
      cloudFrontMock.on(CreateInvalidationCommand).resolves({
        Invalidation: {
          Id: "INVAL123",
          Status: "InProgress",
        },
      });

      const invalidationId = await createInvalidation("DIST123", ["/avatar/*"]);
      expect(invalidationId).toBe("INVAL123");
    });
  });
});
