import { parseErrorResponse } from '@/lib/form-client';

export async function handleRequest(request) {
  try {
    const response = await request();

    if (!response.ok) {
      throw await parseErrorResponse(response);
    }

    if (response.status === 204) {
      return null;
    }

    return await response.json().catch(() => null);
  } catch (error) {
    throw error instanceof Error ? error : new Error('Network error');
  }
}
