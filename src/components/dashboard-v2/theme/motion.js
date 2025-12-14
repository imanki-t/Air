/**
 * Material 3 Motion System
 */

export const easings = {
  emphasized: [0.2, 0.0, 0.0, 1.0], // Begin and end on screen
  emphasizedDecelerate: [0.05, 0.7, 0.1, 1.0], // Enter screen
  emphasizedAccelerate: [0.3, 0.0, 0.8, 0.15], // Exit screen
  standard: [0.2, 0.0, 0, 1.0],
  standardDecelerate: [0, 0, 0, 1],
  standardAccelerate: [0.3, 0, 1, 1],
};

export const durations = {
  short1: 0.05,
  short2: 0.1,
  short3: 0.15,
  short4: 0.2,
  medium1: 0.25,
  medium2: 0.3,
  medium3: 0.35,
  medium4: 0.4,
  long1: 0.45,
  long2: 0.5,
  long3: 0.55,
  long4: 0.6,
  extraLong1: 0.7,
  extraLong2: 0.8,
  extraLong3: 0.9,
  extraLong4: 1.0,
};

// Common Framer Motion variants

export const fade = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: durations.medium2, ease: easings.standard } },
  exit: { opacity: 0, transition: { duration: durations.short3, ease: easings.standardAccelerate } },
};

export const scaleFade = {
  initial: { opacity: 0, scale: 0.95 },
  animate: { opacity: 1, scale: 1, transition: { duration: durations.medium2, ease: easings.emphasizedDecelerate } },
  exit: { opacity: 0, scale: 0.95, transition: { duration: durations.short3, ease: easings.emphasizedAccelerate } },
};

export const slideUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0, transition: { duration: durations.medium4, ease: easings.emphasizedDecelerate } },
  exit: { opacity: 0, y: 20, transition: { duration: durations.medium2, ease: easings.emphasizedAccelerate } },
};

export const slideInRight = {
  initial: { x: '100%' },
  animate: { x: 0, transition: { duration: durations.medium4, ease: easings.emphasizedDecelerate } },
  exit: { x: '100%', transition: { duration: durations.medium2, ease: easings.emphasizedAccelerate } },
};

export const staggerContainer = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05
    }
  }
};

export const staggerItem = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: durations.medium2, ease: easings.standardDecelerate } }
};

export default {
  easings,
  durations,
  fade,
  scaleFade,
  slideUp,
  slideInRight,
  staggerContainer,
  staggerItem
};
