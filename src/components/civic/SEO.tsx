import React from 'react';
import { Helmet } from 'react-helmet-async';

export const defaultOrganizationSchema = {
  "@context": "https://schema.org",
  "@type": "Organization",
  "name": import.meta.env.VITE_APP_NAME || "LocalVoice",
  "url": "https://localvoice.web.app",
  "logo": "https://localvoice.web.app/pwa-512x512.png",
  "description": "A progressive civic engagement platform empowering citizens to instantly report community issues.",
  "location": {
    "@type": "Place",
    "name": "Tirupati",
    "address": {
      "@type": "PostalAddress",
      "addressLocality": "Tirupati",
      "addressRegion": "Andhra Pradesh",
      "addressCountry": "IN"
    }
  }
};

export const defaultWebSiteSchema = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  "name": import.meta.env.VITE_APP_NAME || "LocalVoice",
  "url": import.meta.env.VITE_APP_URL || "https://localvoice.web.app",
  "potentialAction": {
    "@type": "SearchAction",
    "target": `${import.meta.env.VITE_APP_URL || "https://localvoice.web.app"}/map?q={search_term_string}`,
    "query-input": "required name=search_term_string"
  }
};

interface SEOProps {
  title?: string;
  description?: string;
  canonical?: string;
  image?: string;
  imageAlt?: string;
  type?: 'website' | 'article' | 'profile';
  structuredData?: Record<string, any> | Record<string, any>[];
  keywords?: string[];
  author?: string;
  siteName?: string;
  locale?: string;
  noindex?: boolean;
}

export function SEO({
  title = `${import.meta.env.VITE_APP_NAME || 'LocalVoice'} — Smarter Communities Start With a Scan`,
  description = "Scan a QR sticker on any public asset and report civic issues to the right authority in under a minute. No app, no account.",
  canonical,
  image = `${import.meta.env.VITE_APP_URL || 'https://localvoice.web.app'}/pwa-512x512.png`,
  imageAlt = `${import.meta.env.VITE_APP_NAME || 'LocalVoice'} platform preview`,
  type = 'website',
  structuredData,
  keywords = ["civic reporting", "smart city", "infrastructure", "QR reporting"],
  author = import.meta.env.VITE_APP_NAME || 'LocalVoice',
  siteName = import.meta.env.VITE_APP_NAME || 'LocalVoice',
  locale = 'en_IN',
  noindex = false,
}: SEOProps) {
  const siteUrl = import.meta.env.VITE_APP_URL || 'https://localvoice.web.app';
  const fullUrl = canonical || (typeof window !== 'undefined' ? window.location.href : siteUrl);
  const APP_NAME = import.meta.env.VITE_APP_NAME || "LocalVoice";

  const jsonLd = structuredData 
    ? (Array.isArray(structuredData) ? structuredData : [structuredData]).filter(Boolean)
    : [defaultOrganizationSchema, defaultWebSiteSchema];

  return (
    <Helmet>
      {/* Standard Metadata */}
      <title>{title}</title>
      <meta name="description" content={description} />
      <meta name="author" content={author} />
      {keywords && keywords.length > 0 && (
        <meta name="keywords" content={keywords.join(', ')} />
      )}
      <link rel="canonical" href={fullUrl} />
      <meta name="robots" content={noindex ? 'noindex, nofollow' : 'index, follow'} />
      <meta name="theme-color" content="#0f172a" />

      {/* Open Graph / Facebook */}
      <meta property="og:type" content={type} />
      <meta property="og:url" content={fullUrl} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={image} />
      <meta property="og:image:alt" content={imageAlt} />
      <meta property="og:site_name" content={siteName} />
      <meta property="og:locale" content={locale} />

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:url" content={fullUrl} />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={image} />
      <meta name="twitter:image:alt" content={imageAlt} />
      <meta name="twitter:site" content={`@${APP_NAME.replace(/\s+/g, '')}`} />

      {/* Structured Data (JSON-LD) for AEO */}
      {jsonLd.length > 0 && (
        <script type="application/ld+json">
          {JSON.stringify(jsonLd)}
        </script>
      )}
    </Helmet>
  );
}
