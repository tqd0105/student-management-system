import { describe, it, expect, beforeEach, vi } from "vitest";
import { mockClient } from "aws-sdk-client-mock";
import { PutMetricDataCommand } from "@aws-sdk/client-cloudwatch";
import { cloudwatchClient } from "../src/config/cloudwatch.js";
import {
  logStructured,
  recordFileUploadedMetric,
  recordFileDeletedMetric,
  recordErrorMetric,
} from "../src/services/cloudwatch.service.js";

const cwMock = mockClient(cloudwatchClient);

describe("CloudWatch Service", () => {
  beforeEach(() => {
    cwMock.reset();
  });

  describe("logStructured", () => {
    it("should output valid JSON log to console.log", () => {
      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

      logStructured("INFO", "Test message", { requestId: "req-123" });

      expect(consoleSpy).toHaveBeenCalled();
      const rawLog = consoleSpy.mock.calls[0]?.[0];
      // Chuyển JSON thành Object
      const parsed = JSON.parse(rawLog); 

      expect(parsed.level).toBe("INFO");
      expect(parsed.message).toBe("Test message");
      expect(parsed.requestId).toBe("req-123");
      expect(parsed.service).toBe("file-management-api");
      expect(parsed.timestamp).toBeDefined();

      consoleSpy.mockRestore();
    });

    it("should output to console.error when level is ERROR", () => {
      const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      logStructured("ERROR", "Something broke", { errorCode: 500 });

      expect(errorSpy).toHaveBeenCalled();
      const rawLog = errorSpy.mock.calls[0]?.[0];
      const parsed = JSON.parse(rawLog);

      expect(parsed.level).toBe("ERROR");
      expect(parsed.errorCode).toBe(500);

      errorSpy.mockRestore();
    });
  });

  describe("recordFileUploadedMetric", () => {
    it("should publish FilesUploaded and UploadSizeBytes metrics", async () => {
      cwMock.on(PutMetricDataCommand).resolves({});

      await recordFileUploadedMetric(5120);

      expect(cwMock.commandCalls(PutMetricDataCommand).length).toBe(1);
      const call = cwMock.commandCalls(PutMetricDataCommand)[0];
      const params = call?.args[0].input;

      expect(params?.Namespace).toBe("FileManagementService");
      expect(params?.MetricData).toHaveLength(2);
      expect(params?.MetricData?.[0]?.MetricName).toBe("FilesUploaded");
      expect(params?.MetricData?.[1]?.MetricName).toBe("UploadSizeBytes");
      expect(params?.MetricData?.[1]?.Value).toBe(5120);
    });
  });

  describe("recordFileDeletedMetric", () => {
    it("should publish FilesDeleted metric", async () => {
      cwMock.on(PutMetricDataCommand).resolves({});

      await recordFileDeletedMetric();

      expect(cwMock.commandCalls(PutMetricDataCommand).length).toBe(1);
      const params = cwMock.commandCalls(PutMetricDataCommand)[0]?.args[0].input;
      expect(params?.MetricData?.[0]?.MetricName).toBe("FilesDeleted");
    });
  });

  describe("recordErrorMetric", () => {
    it("should publish Errors metric with ErrorType dimension", async () => {
      cwMock.on(PutMetricDataCommand).resolves({});

      await recordErrorMetric("NoSuchKey");

      expect(cwMock.commandCalls(PutMetricDataCommand).length).toBe(1);
      const params = cwMock.commandCalls(PutMetricDataCommand)[0]?.args[0].input;
      expect(params?.MetricData?.[0]?.MetricName).toBe("Errors");
      expect(params?.MetricData?.[0]?.Dimensions?.[0]?.Value).toBe("NoSuchKey");
    });
  });
});
