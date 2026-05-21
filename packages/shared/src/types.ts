export interface Book {
  id: string;
  title: string;
  author: string;
  cover_url: string | null;
  description: string | null;
  created_at: string;
}

export interface Chapter {
  id: string;
  book_id: string;
  chapter_number: number;
  title: string;
  summary_a1_a2: string;
  summary_b1_b2: string;
  summary_c1_c2: string;
  created_at: string;
}

export interface Vocabulary {
  id: string;
  user_id: string;
  word: string;
  translation: string;
  definition: string;
  sentence_context: string;
  created_at: string;
}

export interface Flashcard {
  id: string;
  user_id: string;
  vocabulary_id: string;
  interval: number;
  repetition: number;
  ease_factor: number;
  next_review_date: string;
  vocabulary?: Vocabulary;
}

export interface SRSResult {
  interval: number;
  repetition: number;
  ease_factor: number;
  next_review_date: Date;
}
