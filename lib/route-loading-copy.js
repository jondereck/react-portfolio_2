const DEFAULT_COPY = {
  brand: 'Welcome',
  message: 'Opening portfolio',
  hint: 'Loading projects, skills, and featured work...',
  steps: [
    'Initializing interface...',
    'Loading homepage content...',
    'Preparing featured projects...',
    'Finalizing experience...',
  ],
};

const ROUTE_LOADING_COPY = [
  {
    test: (path) => path === '/tools' || path.startsWith('/tools/'),
    copy: {
      brand: 'JDN Tools',
      message: 'You are being redirected to JDN tools',
      hint: 'Opening Google Drive...',
      steps: [
        'Preparing JDN tools...',
        'Connecting to Google Drive...',
        'Loading your files...',
        'Redirecting now...',
      ],
    },
  },
  {
    test: (path) => path.startsWith('/gallery/'),
    copy: {
      brand: 'Welcome',
      message: 'Opening album',
      hint: 'Loading photos and media...',
      steps: [
        'Opening album...',
        'Loading photos...',
        'Preparing media preview...',
        'Almost ready...',
      ],
    },
  },
  {
    test: (path) => path === '/gallery',
    copy: {
      brand: 'Welcome',
      message: 'Opening gallery',
      hint: 'Loading your albums...',
      steps: [
        'Opening gallery...',
        'Loading albums...',
        'Preparing covers...',
        'Almost ready...',
      ],
    },
  },
  {
    test: (path) => path.startsWith('/admin/login'),
    copy: {
      brand: 'Welcome',
      message: 'Opening admin sign in',
      hint: 'Preparing a secure login...',
      steps: [
        'Opening sign in...',
        'Checking session...',
        'Preparing login form...',
        'Almost ready...',
      ],
    },
  },
  {
    test: (path) => path.startsWith('/admin/gallery'),
    copy: {
      brand: 'Welcome',
      message: 'Opening gallery workspace',
      hint: 'Loading albums and media tools...',
      steps: [
        'Opening gallery workspace...',
        'Loading albums...',
        'Preparing media tools...',
        'Almost ready...',
      ],
    },
  },
  {
    test: (path) => path.startsWith('/admin'),
    copy: {
      brand: 'Welcome',
      message: 'Opening admin workspace',
      hint: 'Loading dashboard tools...',
      steps: [
        'Opening admin workspace...',
        'Loading dashboard...',
        'Preparing controls...',
        'Almost ready...',
      ],
    },
  },
  {
    test: (path) => path.startsWith('/register'),
    copy: {
      brand: 'Welcome',
      message: 'Opening registration',
      hint: 'Preparing your account form...',
      steps: [
        'Opening registration...',
        'Preparing account form...',
        'Checking availability...',
        'Almost ready...',
      ],
    },
  },
];

export function getRouteLoadingCopy(pathname) {
  const path =
    typeof pathname === 'string' && pathname.trim().length > 0
      ? pathname.split('?')[0]
      : '/';

  const match = ROUTE_LOADING_COPY.find((route) => route.test(path));
  return match?.copy ?? DEFAULT_COPY;
}
