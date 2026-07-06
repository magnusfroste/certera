// Curated "recipe" presets shown as visual thumbnails on the landing page.
//
// Recipes are DETERMINISTIC starting points: the thumbnail and the applied
// diploma are both produced by the same client-side DSL renderer, so what you
// click is exactly what you get (no AI reinterpretation). The DSL is kept as
// the current design, so chat iteration works from there.
//
// Keep every recipe within blocks the client renderer supports (background,
// border, header, body, seal, signature) so thumbnail === result.
import type { DiplomaDSL } from '@/diploma-dsl/types';

export type RecipeCategory = 'Academic' | 'Professional' | 'Award' | 'Course';

export interface DiplomaRecipe {
  id: string;
  label: string;
  category: RecipeCategory;
  /** Optional prompt (used only as chat context when the recipe is applied) */
  prompt: string;
  /** The design — rendered for both the thumbnail and the applied diploma */
  dsl: DiplomaDSL;
}

const body = (
  title: string,
  description: string,
  course?: string,
  preText = 'This is to certify that',
): DiplomaDSL['body'] => ({
  title,
  preText,
  recipientName: 'Alex Morgan',
  description,
  courseOrProgram: course,
  date: 'June 2026',
});

export const DIPLOMA_RECIPES: DiplomaRecipe[] = [
  // ── Academic ──
  {
    id: 'classic-university',
    label: 'Classic University',
    category: 'Academic',
    prompt: 'A classic university diploma with a formal serif design, ornate border and a laurel-wreath seal.',
    dsl: {
      brand: { name: 'Ashford University', primaryColor: '#0f1b3d', accentColor: '#c9a84c' },
      layout: { orientation: 'landscape', padding: 'spacious' },
      background: { style: 'parchment' },
      header: { style: 'serif-centered', institutionName: 'Ashford University', subtitle: 'Est. 1897' },
      border: { style: 'classical' },
      body: body('Diploma of Excellence', 'has successfully completed all requirements and is awarded this diploma with honors.', 'Bachelor of Science'),
      seal: { style: 'laurel-wreath', position: 'bottom-right', text: 'HONORS' },
      signature: { style: 'handwriting', name: 'Dr. E. Hart', title: 'Dean' },
    },
  },
  {
    id: 'formal-portrait',
    label: 'Formal Diploma',
    category: 'Academic',
    prompt: 'A formal portrait diploma with an ornamental border and classical seal.',
    dsl: {
      brand: { name: 'St. Aldwin College', primaryColor: '#1a1a2e', accentColor: '#b08d57' },
      layout: { orientation: 'portrait', padding: 'spacious' },
      background: { style: 'ivory' },
      header: { style: 'monumental', institutionName: 'St. Aldwin College', subtitle: 'Faculty of Letters' },
      border: { style: 'ornamental' },
      body: body('Master of Arts', 'having fulfilled the prescribed course of study, is admitted to the degree with all rights and privileges thereto pertaining.', 'Master of Arts'),
      seal: { style: 'classical-round', position: 'bottom-center', text: 'CONFERRED' },
      signature: { style: 'formal', name: 'A. Whitcombe', title: 'Provost' },
    },
  },
  // ── Course ──
  {
    id: 'modern-tech',
    label: 'Tech Bootcamp',
    category: 'Course',
    prompt: 'A modern minimalist tech bootcamp completion certificate with clean lines and a digital signature.',
    dsl: {
      brand: { name: 'Nova Academy', primaryColor: '#0c2a3a', accentColor: '#2d8a9e' },
      layout: { orientation: 'landscape', padding: 'normal' },
      background: { style: 'clean-white' },
      header: { style: 'minimal', institutionName: 'NOVA ACADEMY', subtitle: 'Software Engineering' },
      border: { style: 'modern' },
      body: body('Certificate of Completion', 'has completed the Full-Stack Development program and demonstrated professional proficiency.', 'Full-Stack Development'),
      seal: { style: 'modern-circle', position: 'bottom-right' },
      signature: { style: 'digital', name: 'J. Rivera', title: 'Program Lead' },
    },
  },
  {
    id: 'course-completion',
    label: 'Course Completion',
    category: 'Course',
    prompt: 'A friendly course completion certificate with a clean layout and a star seal.',
    dsl: {
      brand: { name: 'Bright Learning', primaryColor: '#1f3a5f', accentColor: '#e0a92e' },
      layout: { orientation: 'landscape', padding: 'normal' },
      background: { style: 'gradient-cool' },
      header: { style: 'bold-caps', institutionName: 'BRIGHT LEARNING', subtitle: 'Online Courses' },
      border: { style: 'double-line' },
      body: body('Certificate of Completion', 'has successfully completed the course and met all learning objectives.', 'Data Analysis Fundamentals'),
      seal: { style: 'star', position: 'bottom-right' },
      signature: { style: 'handwriting', name: 'P. Nilsson', title: 'Instructor' },
    },
  },
  {
    id: 'workshop',
    label: 'Workshop',
    category: 'Course',
    prompt: 'A warm workshop attendance certificate with a soft background and rosette seal.',
    dsl: {
      brand: { name: 'Craft Studio', primaryColor: '#5c2018', accentColor: '#c17c74' },
      layout: { orientation: 'landscape', padding: 'normal' },
      background: { style: 'gradient-warm' },
      header: { style: 'elegant-script', institutionName: 'Craft Studio', subtitle: 'Hands-on Workshops' },
      border: { style: 'wave' },
      body: body('Certificate of Attendance', 'attended and actively participated in the workshop.', 'Ceramics Intensive'),
      seal: { style: 'rosette', position: 'bottom-right', text: 'ATTENDED' },
      signature: { style: 'elegant', name: 'M. Rossi', title: 'Facilitator' },
    },
  },
  // ── Professional ──
  {
    id: 'professional-cert',
    label: 'Professional Cert',
    category: 'Professional',
    prompt: 'A corporate professional certification with an art-deco frame and shield seal.',
    dsl: {
      brand: { name: 'Meridian Institute', primaryColor: '#2d3748', accentColor: '#3b6fa0' },
      layout: { orientation: 'landscape', padding: 'normal' },
      background: { style: 'marble' },
      header: { style: 'bold-caps', institutionName: 'MERIDIAN INSTITUTE', subtitle: 'Professional Standards' },
      border: { style: 'art-deco' },
      body: body('Certified Professional', 'has met the requirements and is recognized as a Certified Project Professional.', 'Project Management'),
      seal: { style: 'shield', position: 'bottom-right', text: 'CERTIFIED' },
      signature: { style: 'formal', name: 'S. Okafor', title: 'Director' },
    },
  },
  {
    id: 'membership',
    label: 'Membership',
    category: 'Professional',
    prompt: 'A membership certificate with a marble background and compass seal.',
    dsl: {
      brand: { name: 'Cartographers Guild', primaryColor: '#0c2340', accentColor: '#c9a84c' },
      layout: { orientation: 'landscape', padding: 'normal' },
      background: { style: 'linen' },
      header: { style: 'serif-centered', institutionName: 'Cartographers Guild', subtitle: 'Founded 1921' },
      border: { style: 'celtic-knot' },
      body: body('Certificate of Membership', 'is hereby admitted as a full member in good standing.', 'Full Member'),
      seal: { style: 'compass', position: 'bottom-right', text: 'N' },
      signature: { style: 'stamp', name: 'Guild Office', title: 'Registrar' },
    },
  },
  {
    id: 'certification-portrait',
    label: 'Certification',
    category: 'Professional',
    prompt: 'A portrait professional certificate with a clean modern header and shield seal.',
    dsl: {
      brand: { name: 'Atlas Certification', primaryColor: '#14324a', accentColor: '#2d8a9e' },
      layout: { orientation: 'portrait', padding: 'spacious' },
      background: { style: 'clean-white' },
      header: { style: 'modern-left', institutionName: 'Atlas Certification', subtitle: 'Accredited Body' },
      border: { style: 'geometric-deco' },
      body: body('Certificate of Qualification', 'has demonstrated the required competencies and is awarded this professional qualification.', 'Certified Analyst'),
      seal: { style: 'shield', position: 'bottom-center', text: 'QUALIFIED' },
      signature: { style: 'digital', name: 'R. Adeyemi', title: 'Assessor' },
    },
  },
  // ── Award ──
  {
    id: 'elegant-gold',
    label: 'Elegant Award',
    category: 'Award',
    prompt: 'An elegant gold-bordered award with a flowing script header and an ornamental frame.',
    dsl: {
      brand: { name: 'Belle Académie', primaryColor: '#5b2c20', accentColor: '#c6a961' },
      layout: { orientation: 'landscape', padding: 'spacious' },
      background: { style: 'ivory' },
      header: { style: 'elegant-script', institutionName: 'Belle Académie', subtitle: 'School of Fine Arts' },
      border: { style: 'ornamental' },
      body: body('Award of Achievement', 'is hereby recognized for outstanding dedication and artistic accomplishment.', 'Fine Arts'),
      seal: { style: 'classical-round', position: 'bottom-right', text: 'AWARDED' },
      signature: { style: 'elegant', name: 'M. Laurent', title: 'Director' },
    },
  },
  {
    id: 'dark-premium',
    label: 'Dark Premium',
    category: 'Award',
    prompt: 'A premium dark award with gold accents on a deep navy background and a star seal.',
    dsl: {
      brand: { name: 'Apex Institute', primaryColor: '#f0e6d3', accentColor: '#c6a961' },
      layout: { orientation: 'landscape', padding: 'spacious' },
      background: { style: 'cosmic-dark' },
      header: { style: 'monumental', institutionName: 'APEX INSTITUTE', subtitle: 'Executive Education' },
      border: { style: 'geometric-deco', color: '#c6a961' },
      body: body('Award of Distinction', 'is recognized for exceptional leadership and measurable impact.', 'Executive Leadership'),
      seal: { style: 'star', position: 'bottom-right' },
      signature: { style: 'elegant', name: 'R. Vance', title: 'President' },
    },
  },
  {
    id: 'botanical',
    label: 'Botanical',
    category: 'Award',
    prompt: 'A botanical-themed certificate with vine borders and soft greens.',
    dsl: {
      brand: { name: 'Green Roots Institute', primaryColor: '#1a3c2a', accentColor: '#8b7355' },
      layout: { orientation: 'landscape', padding: 'spacious' },
      background: { style: 'botanical-green' },
      header: { style: 'serif-centered', institutionName: 'Green Roots Institute', subtitle: 'Sustainability Studies' },
      border: { style: 'botanical-vine' },
      body: body('Certificate of Distinction', 'has completed the Regenerative Design program with distinction.', 'Regenerative Design'),
      seal: { style: 'rosette', position: 'bottom-right', text: 'AWARD' },
      signature: { style: 'handwriting', name: 'L. Chen', title: 'Head of Studies' },
    },
  },
];
