// Curated "recipe" presets shown as visual thumbnails on the landing page.
//
// Recipes are DETERMINISTIC starting points: the thumbnail and the applied
// diploma are both produced by the same shared DSL renderer, so what you
// click is exactly what you get (no AI reinterpretation). The DSL is kept as
// the current design, so chat iteration works from there.
//
// Curation goals:
// - RECOGNITION: every recipe targets a distinct real-world use case (degree,
//   bootcamp, workshop, sports club, school, HR, volunteering, …) so most
//   visitors see one that feels like "theirs".
// - VARIETY: each recipe uses a different palette; all typography pairs and
//   several compositions/decorations are represented.
// Keep every recipe within blocks the shared renderer supports so
// thumbnail === result.
import type { DiplomaDSL } from '@/diploma-dsl/render';

export type RecipeCategory =
  | 'Academic'
  | 'Professional'
  | 'Award'
  | 'Course'
  | 'School'
  | 'Recognition';

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
      palette: 'parchment-burgundy',
      typography: { pair: 'serif-classic' },
      layout: { orientation: 'landscape', padding: 'normal' },
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
      palette: 'ivory-navy',
      typography: { pair: 'display-editorial' },
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
      palette: 'arctic-steel',
      typography: { pair: 'sans-modern' },
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
    id: 'code-academy',
    label: 'Developer Cert',
    category: 'Course',
    prompt: 'A dark developer certificate with monospace typography, corner accents and a digital signature.',
    dsl: {
      brand: { name: 'Hexline Labs', primaryColor: '#e0f2fe', accentColor: '#67e8f9' },
      palette: 'cosmic-cyan',
      typography: { pair: 'mono-tech' },
      layout: { orientation: 'landscape', padding: 'normal', composition: 'corner-accent' },
      background: { style: 'cosmic-dark' },
      header: { style: 'minimal', institutionName: 'HEXLINE LABS', subtitle: 'Engineering Certification' },
      border: { style: 'modern', color: '#67e8f9' },
      body: body('Backend Engineering', 'has passed all practical assessments in distributed systems, APIs and data modeling.', 'Level II — Distinction'),
      seal: { style: 'modern-circle', position: 'bottom-right' },
      signature: { style: 'digital', name: 'S. Tanaka', title: 'Head of Certification' },
    },
  },
  {
    id: 'course-completion',
    label: 'Course Completion',
    category: 'Course',
    prompt: 'A friendly course completion certificate with a clean layout and a star seal.',
    dsl: {
      brand: { name: 'Bright Learning', primaryColor: '#1f3a5f', accentColor: '#e0a92e' },
      palette: 'coastal-fresh',
      typography: { pair: 'sans-modern' },
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
      palette: 'desert-clay',
      typography: { pair: 'script-romantic' },
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
    prompt: 'A corporate professional certification with an art-deco frame, guilloche texture and shield seal.',
    dsl: {
      brand: { name: 'Meridian Institute', primaryColor: '#2d3748', accentColor: '#3b6fa0' },
      palette: 'marble-emerald',
      typography: { pair: 'sans-modern' },
      layout: { orientation: 'landscape', padding: 'normal' },
      decorations: ['guilloche-pattern'],
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
    prompt: 'A membership certificate with a linen background and compass seal.',
    dsl: {
      brand: { name: 'Cartographers Guild', primaryColor: '#0c2340', accentColor: '#c9a84c' },
      palette: 'linen-charcoal',
      typography: { pair: 'serif-classic' },
      layout: { orientation: 'landscape', padding: 'normal' },
      background: { style: 'linen' },
      header: { style: 'serif-centered', institutionName: 'Cartographers Guild', subtitle: 'Founded 1921' },
      border: { style: 'double-line' },
      body: body('Certificate of Membership', 'is hereby admitted as a full member in good standing.', 'Full Member'),
      seal: { style: 'compass', position: 'bottom-right', text: 'N' },
      signature: { style: 'stamp', name: 'Guild Office', title: 'Registrar' },
    },
  },
  {
    id: 'certification-portrait',
    label: 'Certification',
    category: 'Professional',
    prompt: 'A monochrome portrait professional certificate with a clean modern header and shield seal.',
    dsl: {
      brand: { name: 'Atlas Certification', primaryColor: '#0a0a0a', accentColor: '#525252' },
      palette: 'minimal-mono',
      typography: { pair: 'sans-modern' },
      layout: { orientation: 'portrait', padding: 'spacious' },
      background: { style: 'clean-white' },
      header: { style: 'modern-left', institutionName: 'Atlas Certification', subtitle: 'Accredited Body' },
      border: { style: 'art-deco' },
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
    prompt: 'An elegant fine-arts award with a flowing script header on a soft watercolor background.',
    dsl: {
      brand: { name: 'Belle Académie', primaryColor: '#4a1942', accentColor: '#c45c7c' },
      palette: 'watercolor-romance',
      typography: { pair: 'script-romantic' },
      layout: { orientation: 'landscape', padding: 'spacious' },
      background: { style: 'watercolor-soft' },
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
    prompt: 'A premium dark award with gold accents, a centered medallion seal and a deep navy background.',
    dsl: {
      brand: { name: 'Apex Institute', primaryColor: '#f0e6d3', accentColor: '#c6a961' },
      palette: 'midnight-gold',
      typography: { pair: 'display-editorial' },
      layout: { orientation: 'landscape', padding: 'normal', composition: 'medallion-center' },
      background: { style: 'cosmic-dark' },
      header: { style: 'monumental', institutionName: 'APEX INSTITUTE', subtitle: 'Executive Education' },
      border: { style: 'art-deco', color: '#c6a961' },
      body: body('Award of Distinction', 'is recognized for exceptional leadership and measurable impact.', 'Executive Leadership'),
      seal: { style: 'star', position: 'bottom-center' },
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
      palette: 'forest-cream',
      typography: { pair: 'serif-classic' },
      layout: { orientation: 'landscape', padding: 'normal' },
      background: { style: 'botanical-green' },
      header: { style: 'serif-centered', institutionName: 'Green Roots Institute', subtitle: 'Sustainability Studies' },
      border: { style: 'wave' },
      body: body('Certificate of Distinction', 'has completed the Regenerative Design program with distinction.', 'Regenerative Design'),
      seal: { style: 'rosette', position: 'bottom-right', text: 'AWARD' },
      signature: { style: 'handwriting', name: 'L. Chen', title: 'Head of Studies' },
    },
  },
  // ── School ──
  {
    id: 'star-student',
    label: 'Star Student',
    category: 'School',
    prompt: 'A cheerful school award with a bold banner header, playful typography and a star seal.',
    dsl: {
      brand: { name: 'Maple Grove School', primaryColor: '#0c2340', accentColor: '#c9a84c' },
      palette: 'ocean-brass',
      typography: { pair: 'mixed-contrast' },
      layout: { orientation: 'landscape', padding: 'normal', composition: 'banner-top' },
      background: { style: 'ocean-deep' },
      header: { style: 'bold-caps', institutionName: 'MAPLE GROVE SCHOOL', subtitle: 'Star Student Award' },
      border: { style: 'modern' },
      body: body('Star Student', 'for curiosity, kindness and great effort in class this term.', 'Year 5 — Room B', 'Proudly presented to'),
      seal: { style: 'star', position: 'bottom-right' },
      signature: { style: 'handwriting', name: 'Ms. J. Parker', title: 'Class Teacher' },
    },
  },
  // ── Recognition ──
  {
    id: 'sports-champion',
    label: 'Sports Champion',
    category: 'Recognition',
    prompt: 'A bold sports achievement certificate with strong display type and a shield seal.',
    dsl: {
      brand: { name: 'Riverside Athletics', primaryColor: '#3b0d0d', accentColor: '#c6a961' },
      palette: 'royal-burgundy',
      typography: { pair: 'mixed-contrast' },
      layout: { orientation: 'landscape', padding: 'normal' },
      background: { style: 'royal-burgundy' },
      header: { style: 'bold-caps', institutionName: 'RIVERSIDE ATHLETICS', subtitle: 'Season 2026' },
      border: { style: 'classical' },
      body: body('Champion Award', 'for winning the regional finals and showing outstanding sportsmanship all season.', '100m Sprint — Gold', 'Awarded to'),
      seal: { style: 'shield', position: 'bottom-right', text: 'GOLD' },
      signature: { style: 'formal', name: 'C. Duarte', title: 'Head Coach' },
    },
  },
  {
    id: 'employee-month',
    label: 'Employee Award',
    category: 'Recognition',
    prompt: 'A modern employee recognition certificate with a split layout and digital signature.',
    dsl: {
      brand: { name: 'Northwind Group', primaryColor: '#1a1a1a', accentColor: '#c45c7c' },
      palette: 'editorial-rose',
      typography: { pair: 'sans-modern' },
      layout: { orientation: 'landscape', padding: 'normal', composition: 'split-horizontal' },
      background: { style: 'watercolor-soft' },
      header: { style: 'modern-left', institutionName: 'Northwind Group', subtitle: 'People & Culture' },
      border: { style: 'minimal' },
      body: body('Employee of the Month', 'for going above and beyond for the team and our customers.', 'Customer Success', 'Recognizing'),
      seal: { style: 'modern-circle', position: 'bottom-right' },
      signature: { style: 'digital', name: 'D. Kowalski', title: 'Head of People' },
    },
  },
  {
    id: 'volunteer-thanks',
    label: 'Volunteer Thanks',
    category: 'Recognition',
    prompt: 'A warm appreciation certificate for volunteers with vintage tones and corner flourishes.',
    dsl: {
      brand: { name: 'Harbor Community Aid', primaryColor: '#2d1b00', accentColor: '#8b6f5e' },
      palette: 'vintage-sepia',
      typography: { pair: 'serif-classic' },
      layout: { orientation: 'landscape', padding: 'normal' },
      decorations: ['corner-flourishes'],
      background: { style: 'vintage-sepia' },
      header: { style: 'serif-centered', institutionName: 'Harbor Community Aid', subtitle: 'Volunteer Program' },
      border: { style: 'double-line' },
      body: body('Certificate of Appreciation', 'in heartfelt gratitude for 120 hours of volunteer service to our community.', 'Food Outreach', 'With thanks to'),
      seal: { style: 'rosette', position: 'bottom-right', text: 'THANKS' },
      signature: { style: 'handwriting', name: 'R. Okonkwo', title: 'Program Coordinator' },
    },
  },
];
