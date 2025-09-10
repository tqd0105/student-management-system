/**
 * Standardized API Response Formatter (TypeScript)
 * Student Management System - LightBrave Team
 */

import { Response } from 'express';

interface BaseResponse {
  success: boolean;
  message: string;
  timestamp: string;
}

interface SuccessResponse<T = any> extends BaseResponse {
  success: true;
  data: T;
}

interface ErrorResponse extends BaseResponse {
  success: false;
  error?: string;
  errors?: any;
  path?: string;
  method?: string;
}

interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

interface PaginatedResponse<T = any> extends BaseResponse {
  success: true;
  data: T[];
  pagination: PaginationMeta;
}

export class ApiResponse {
  /**
   * Success response
   */
  static success<T>(
    res: Response, 
    data: T = null as T, 
    message: string = 'Success', 
    statusCode: number = 200
  ): Response<SuccessResponse<T>> {
    const response: SuccessResponse<T> = {
      success: true,
      message,
      timestamp: new Date().toISOString(),
      data
    };

    return res.status(statusCode).json(response);
  }

  /**
   * Error response
   */
  static error(
    res: Response, 
    message: string = 'Error occurred', 
    statusCode: number = 400, 
    errors: any = null,
    errorCode?: string
  ): Response<ErrorResponse> {
    const response: ErrorResponse = {
      success: false,
      message,
      timestamp: new Date().toISOString(),
      ...(errors && { errors }),
      ...(errorCode && { error: errorCode })
    };

    return res.status(statusCode).json(response);
  }

  /**
   * Validation error response
   */
  static validationError(res: Response, errors: any): Response<ErrorResponse> {
    return ApiResponse.error(res, 'Validation failed', 400, errors, 'VALIDATION_ERROR');
  }

  /**
   * Unauthorized response
   */
  static unauthorized(res: Response, message: string = 'Unauthorized access'): Response<ErrorResponse> {
    return ApiResponse.error(res, message, 401, null, 'UNAUTHORIZED');
  }

  /**
   * Forbidden response
   */
  static forbidden(res: Response, message: string = 'Access forbidden'): Response<ErrorResponse> {
    return ApiResponse.error(res, message, 403, null, 'FORBIDDEN');
  }

  /**
   * Not found response
   */
  static notFound(res: Response, message: string = 'Resource not found'): Response<ErrorResponse> {
    return ApiResponse.error(res, message, 404, null, 'NOT_FOUND');
  }

  /**
   * Server error response
   */
  static serverError(res: Response, message: string = 'Internal server error'): Response<ErrorResponse> {
    return ApiResponse.error(res, message, 500, null, 'SERVER_ERROR');
  }

  /**
   * Rate limit error response
   */
  static rateLimitError(res: Response, message: string = 'Rate limit exceeded'): Response<ErrorResponse> {
    return ApiResponse.error(res, message, 429, null, 'RATE_LIMIT_EXCEEDED');
  }

  /**
   * Paginated response
   */
  static paginated<T>(
    res: Response, 
    data: T[], 
    pagination: { page: number; limit: number; total: number }, 
    message: string = 'Data retrieved successfully'
  ): Response<PaginatedResponse<T>> {
    const paginationMeta: PaginationMeta = {
      page: pagination.page,
      limit: pagination.limit,
      total: pagination.total,
      totalPages: Math.ceil(pagination.total / pagination.limit),
      hasNext: pagination.page < Math.ceil(pagination.total / pagination.limit),
      hasPrev: pagination.page > 1
    };

    const response: PaginatedResponse<T> = {
      success: true,
      message,
      timestamp: new Date().toISOString(),
      data,
      pagination: paginationMeta
    };

    return res.status(200).json(response);
  }

  /**
   * Created response (for POST requests)
   */
  static created<T>(
    res: Response, 
    data: T, 
    message: string = 'Resource created successfully'
  ): Response<SuccessResponse<T>> {
    return ApiResponse.success(res, data, message, 201);
  }

  /**
   * Updated response (for PUT/PATCH requests)
   */
  static updated<T>(
    res: Response, 
    data: T, 
    message: string = 'Resource updated successfully'
  ): Response<SuccessResponse<T>> {
    return ApiResponse.success(res, data, message, 200);
  }

  /**
   * Deleted response (for DELETE requests)
   */
  static deleted(
    res: Response, 
    message: string = 'Resource deleted successfully'
  ): Response<SuccessResponse<null>> {
    return ApiResponse.success(res, null, message, 200);
  }
}
