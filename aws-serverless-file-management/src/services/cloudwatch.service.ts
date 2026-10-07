import {
  PutMetricDataCommand,
  type MetricDatum,
} from "@aws-sdk/client-cloudwatch";
import { cloudwatchClient } from "../config/cloudwatch.js";

const NAMESPACE = "FileManagementService";

export function logStructured(
  level: "INFO" | "WARN" | "ERROR",
  message: string,
  context: Record<string, any> = {},
): void {
  const logEntry = {
    timestamp: new Date().toISOString(),
    level,
    service: "file-management-api",
    message,
    ...context,
  };

  if (level === "ERROR") {
    console.error(JSON.stringify(logEntry));
  } else if (level === "WARN") {
    console.warn(JSON.stringify(logEntry));
  } else {
    console.log(JSON.stringify(logEntry));
  }
}

export async function recordFileUploadedMetric(sizeBytes: number): Promise<void> {
  const metricData: MetricDatum[] = [
    {
      MetricName: "FilesUploaded",
      Value: 1,
      Unit: "Count",
      Timestamp: new Date(),
    },
    {
      MetricName: "UploadSizeBytes",
      Value: sizeBytes,
      Unit: "Bytes",
      Timestamp: new Date(),
    },
  ];

  await cloudwatchClient.send(
    new PutMetricDataCommand({
      Namespace: NAMESPACE,
      MetricData: metricData,
    }),
  );
}

export async function recordFileDeletedMetric(): Promise<void> {
  await cloudwatchClient.send(
    new PutMetricDataCommand({
      Namespace: NAMESPACE,
      MetricData: [
        {
          MetricName: "FilesDeleted",
          Value: 1,
          Unit: "Count",
          Timestamp: new Date(),
        },
      ],
    }),
  );
}

export async function recordErrorMetric(errorType: string): Promise<void> {
  await cloudwatchClient.send(
    new PutMetricDataCommand({
      Namespace: NAMESPACE,
      MetricData: [
        {
          MetricName: "Errors",
          Value: 1,
          Unit: "Count",
          Dimensions: [
            {
              Name: "ErrorType",
              Value: errorType,
            },
          ],
          Timestamp: new Date(),
        },
      ],
    }),
  );
}
