interface PageSEO {
  title: string;
  description: string;
  keywords?: string;
  ogImage?: string;
  canonicalUrl?: string;
}

interface PageSEOMap {
  [path: string]: PageSEO;
}

export const pageSEOData: PageSEOMap = {
  '/': {
    title: 'Home - Plastic Clever Schools',
    description: 'Empower your school to reduce plastic waste. Join our award-winning program with free resources and expert support for environmental education.',
    keywords: 'plastic waste reduction, school environmental programs, sustainability education, eco-friendly schools',
    ogImage: '/assets/Logo_1757848498470.png',
    canonicalUrl: 'https://plasticclever.replit.app/'
  },
  '/resources': {
    title: 'Educational Resources - Plastic Clever Schools',
    description: 'Access free educational materials, worksheets, and activities for your Plastic Clever Schools journey. Download curriculum-aligned resources for all ages.',
    keywords: 'educational resources, plastic waste worksheets, environmental education materials, school activities',
    ogImage: '/assets/generated_images/Kids_recycling_at_school_a7869617.png',
    canonicalUrl: 'https://plasticclever.replit.app/resources'
  },
  '/inspiration': {
    title: 'Inspiration & Success Stories - Plastic Clever Schools',
    description: 'Discover inspiring stories from schools reducing plastic waste. See real examples of student-led environmental action and sustainable practices.',
    keywords: 'school success stories, environmental inspiration, student-led action, plastic reduction examples',
    ogImage: '/assets/emoji-a2ce9597-1802-41f9-90ac-02c0f6bc39c4_1757856002008.png',
    canonicalUrl: 'https://plasticclever.replit.app/inspiration'
  },
  '/schools-map': {
    title: 'Participating Schools Map - Plastic Clever Schools',
    description: 'Explore over 1,500 registered Plastic Clever Schools worldwide. Find participating schools in your area and join the global movement.',
    keywords: 'schools map, registered schools, global movement, participating schools worldwide',
    ogImage: '/assets/Logo_1757848498470.png',
    canonicalUrl: 'https://plasticclever.replit.app/schools-map'
  },
  '/search': {
    title: 'Search Resources - Plastic Clever Schools',
    description: 'Search our comprehensive library of educational resources, activities, and materials for reducing plastic waste in schools.',
    keywords: 'search resources, educational materials, plastic waste activities, school resources search',
    ogImage: '/assets/generated_images/Kids_recycling_at_school_a7869617.png',
    canonicalUrl: 'https://plasticclever.replit.app/search'
  },
  '/register': {
    title: 'Register Your School - Plastic Clever Schools',
    description: 'Join over 1,500 schools worldwide in the Plastic Clever Schools program. Register for free access to resources and expert support.',
    keywords: 'register school, join program, school registration, environmental education program',
    ogImage: '/assets/Logo_1757848498470.png',
    canonicalUrl: 'https://plasticclever.replit.app/register'
  },
  '/login': {
    title: 'Sign In - Plastic Clever Schools',
    description: 'Access your Plastic Clever Schools account to track progress, download resources, and manage your school\'s environmental initiatives.',
    keywords: 'sign in, login, school account access, track progress',
    ogImage: '/assets/Logo_1757848498470.png',
    canonicalUrl: 'https://plasticclever.replit.app/login'
  },
  '/admin': {
    title: 'Admin Panel - Plastic Clever Schools',
    description: 'Administrative dashboard for managing Plastic Clever Schools program resources, schools, and statistics.',
    keywords: 'admin panel, dashboard, program management',
    ogImage: '/assets/Logo_1757848498470.png',
    canonicalUrl: 'https://plasticclever.replit.app/admin'
  }
};

export function updatePageSEO(location: string, isAuthenticated?: boolean) {
  const path = location === '/' && isAuthenticated ? '/dashboard' : location;
  const seoData = pageSEOData[path] || pageSEOData['/'];
  
  // Update document title
  document.title = seoData.title;
  
  // Update meta description
  let metaDescription = document.querySelector('meta[name="description"]');
  if (metaDescription) {
    metaDescription.setAttribute('content', seoData.description);
  } else {
    metaDescription = document.createElement('meta');
    metaDescription.setAttribute('name', 'description');
    metaDescription.setAttribute('content', seoData.description);
    document.head.appendChild(metaDescription);
  }
  
  // Update meta keywords
  if (seoData.keywords) {
    let metaKeywords = document.querySelector('meta[name="keywords"]');
    if (metaKeywords) {
      metaKeywords.setAttribute('content', seoData.keywords);
    } else {
      metaKeywords = document.createElement('meta');
      metaKeywords.setAttribute('name', 'keywords');
      metaKeywords.setAttribute('content', seoData.keywords);
      document.head.appendChild(metaKeywords);
    }
  }
  
  // Update Open Graph title
  let ogTitle = document.querySelector('meta[property="og:title"]');
  if (ogTitle) {
    ogTitle.setAttribute('content', seoData.title);
  }
  
  // Update Open Graph description
  let ogDescription = document.querySelector('meta[property="og:description"]');
  if (ogDescription) {
    ogDescription.setAttribute('content', seoData.description);
  }
  
  // Update Open Graph URL
  if (seoData.canonicalUrl) {
    let ogUrl = document.querySelector('meta[property="og:url"]');
    if (ogUrl) {
      ogUrl.setAttribute('content', seoData.canonicalUrl);
    }
    
    // Update canonical URL
    let canonical = document.querySelector('link[rel="canonical"]');
    if (canonical) {
      canonical.setAttribute('href', seoData.canonicalUrl);
    }
  }
  
  // Update Open Graph image
  if (seoData.ogImage) {
    let ogImage = document.querySelector('meta[property="og:image"]');
    if (ogImage) {
      ogImage.setAttribute('content', `https://plasticclever.replit.app${seoData.ogImage}`);
    }
  }
  
  // Update Twitter card title and description
  let twitterTitle = document.querySelector('meta[name="twitter:title"]');
  if (twitterTitle) {
    twitterTitle.setAttribute('content', seoData.title);
  }
  
  let twitterDescription = document.querySelector('meta[name="twitter:description"]');
  if (twitterDescription) {
    twitterDescription.setAttribute('content', seoData.description);
  }
}

export function addStructuredData(type: 'WebSite' | 'Organization' | 'EducationalOrganization', data: any) {
  // Remove existing structured data
  const existingScript = document.querySelector('script[type="application/ld+json"]');
  if (existingScript) {
    existingScript.remove();
  }
  
  // Add new structured data
  const script = document.createElement('script');
  script.type = 'application/ld+json';
  script.textContent = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': type,
    ...data
  });
  document.head.appendChild(script);
}

// Default structured data for the website
export const defaultStructuredData = {
  name: 'Plastic Clever Schools',
  description: 'Award-winning program helping schools reduce plastic waste through education and student-led action.',
  url: 'https://plasticclever.replit.app',
  logo: 'https://plasticclever.replit.app/assets/Logo_1757848498470.png',
  sameAs: [
    'https://www.instagram.com/plastic_clever_schools'
  ],
  educationalCredentialAwarded: 'Plastic Clever Schools Certificate',
  offers: {
    '@type': 'Offer',
    price: '0',
    priceCurrency: 'USD',
    availability: 'https://schema.org/InStock',
    description: 'Free educational resources and program access'
  }
};