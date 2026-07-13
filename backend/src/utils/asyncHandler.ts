import type { Request, Response, NextFunction } from 'express';

export function asyncHandler<TRequest extends Request = Request>(
  handler: (request: TRequest, response: Response, next: NextFunction) => Promise<unknown>,
) {
  return (request: TRequest, response: Response, next: NextFunction) => {
    handler(request, response, next).catch(next);
  };
}
