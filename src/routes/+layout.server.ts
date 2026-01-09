import { env } from '$env/dynamic/public';

export const load = async () => {
	return {
		config: {
			apiServiceUrl: env.PUBLIC_API_SERVICE_URL || 'http://localhost:8000'
		}
	};
};
