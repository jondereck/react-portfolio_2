export async function handleRequest(request) {
  try {
    const response = await request();

    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({}));
      throw new Error(
        typeof errorBody?.error === 'string'
          ? errorBody.error
          : typeof errorBody?.message === 'string'
            ? errorBody.message
            : 'Something went wrong'
      );
    }

    if (response.status === 204) {
      return null;
    }

    return await response.json().catch(() => null);
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : 'Network error');
  }
}
