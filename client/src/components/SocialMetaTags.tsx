import { useEffect } from 'react';

interface SocialMetaTagsProps {
  title: string;
  description: string;
  image?: string;
  url?: string;
  type?: string;
  siteName?: string;
}

export function SocialMetaTags({
  title,
  description,
  image,
  url = typeof window !== 'undefined' ? window.location.href : '',
  type = 'article',
  siteName = 'Plastic Clever Schools',
}: SocialMetaTagsProps) {
  useEffect(() => {
    const truncatedDescription = description.length > 150 
      ? description.substring(0, 150) + '...' 
      : description;

    const metaTags = [
      { property: 'og:title', content: title },
      { property: 'og:description', content: truncatedDescription },
      { property: 'og:url', content: url },
      { property: 'og:type', content: type },
      { property: 'og:site_name', content: siteName },
      { name: 'twitter:card', content: 'summary_large_image' },
      { name: 'twitter:title', content: title },
      { name: 'twitter:description', content: truncatedDescription },
      { name: 'description', content: truncatedDescription },
    ];

    if (image) {
      metaTags.push(
        { property: 'og:image', content: image },
        { name: 'twitter:image', content: image }
      );
    }

    const existingTags: HTMLMetaElement[] = [];

    metaTags.forEach((tag) => {
      const selector = tag.property 
        ? `meta[property="${tag.property}"]` 
        : `meta[name="${tag.name}"]`;
      
      let element = document.querySelector(selector) as HTMLMetaElement;
      
      if (!element) {
        element = document.createElement('meta');
        if (tag.property) {
          element.setAttribute('property', tag.property);
        } else if (tag.name) {
          element.setAttribute('name', tag.name);
        }
        document.head.appendChild(element);
      }
      
      element.setAttribute('content', tag.content);
      existingTags.push(element);
    });

    let canonicalLink = document.querySelector('link[rel="canonical"]') as HTMLLinkElement;
    if (!canonicalLink) {
      canonicalLink = document.createElement('link');
      canonicalLink.setAttribute('rel', 'canonical');
      document.head.appendChild(canonicalLink);
    }
    canonicalLink.setAttribute('href', url);

    const originalTitle = document.title;
    document.title = `${title} | ${siteName}`;

    return () => {
      document.title = originalTitle;
    };
  }, [title, description, image, url, type, siteName]);

  return null;
}
