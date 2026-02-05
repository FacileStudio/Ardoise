export const en = {
  common: {
    buttons: {
      save: 'Save',
      cancel: 'Cancel',
      delete: 'Delete',
      edit: 'Edit',
      submit: 'Submit',
      back: 'Back',
      next: 'Next',
      confirm: 'Confirm',
      close: 'Close',
    },
    actions: {
      loading: 'Loading...',
      processing: 'Processing...',
      success: 'Success!',
      error: 'An error occurred',
    },
    validation: {
      required: 'This field is required',
      invalidEmail: 'Invalid email address',
      invalidPassword: 'Password must be at least 8 characters',
      passwordMismatch: 'Passwords do not match',
    },
  },
  auth: {
    login: {
      title: 'Log In',
      subtitle: 'Welcome back! Please enter your details.',
      email: 'Email',
      password: 'Password',
      forgotPassword: 'Forgot password?',
      rememberMe: 'Remember me',
      submit: 'Sign in',
      noAccount: "Don't have an account?",
      signUp: 'Sign up',
    },
    register: {
      title: 'Create Account',
      subtitle: 'Get started with your free account.',
      name: 'Full Name',
      email: 'Email',
      password: 'Password',
      confirmPassword: 'Confirm Password',
      submit: 'Create account',
      hasAccount: 'Already have an account?',
      signIn: 'Sign in',
      terms: 'By signing up, you agree to our',
      termsLink: 'Terms of Service',
      and: 'and',
      privacyLink: 'Privacy Policy',
    },
    logout: 'Log out',
  },
  profile: {
    title: 'Profile',
    editProfile: 'Edit Profile',
    changeAvatar: 'Change Avatar',
    changeCover: 'Change Cover',
    uploadingAvatar: 'Uploading avatar...',
    uploadingCover: 'Uploading cover...',
    deleteConfirm: 'Are you sure you want to delete this?',
    subscription: {
      free: 'Free Account',
      premium: 'Premium Member',
      manage: 'Manage Subscription',
      upgrade: 'Upgrade to Premium',
    },
    stats: {
      role: 'Role',
      member_since: 'Member Since',
      experience: 'Experience',
    },
  },
  contact: {
    title: 'Contact Us',
    subtitle: 'Get in touch with our team.',
    name: 'Name',
    email: 'Email',
    message: 'Message',
    submit: 'Send Message',
    success: 'Message sent successfully!',
    error: 'Failed to send message. Please try again.',
  },
  errors: {
    notFound: 'Page not found',
    unauthorized: 'Unauthorized access',
    serverError: 'Server error',
    networkError: 'Network error. Please check your connection.',
    uploadError: 'Failed to upload file',
  },
  nav: {
    home: 'Home',
    features: 'Features',
    pricing: 'Pricing',
    about: 'About',
    contact: 'Contact',
    dashboard: 'Dashboard',
    profile: 'Profile',
  },
};

type DeepStringify<T> = {
  [K in keyof T]: T[K] extends string
    ? string
    : T[K] extends object
    ? DeepStringify<T[K]>
    : T[K];
};

export type EnTranslations = DeepStringify<typeof en>;
