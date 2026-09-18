-- Create reviews table for order feedback
CREATE TABLE IF NOT EXISTS reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES product_orders(id) ON DELETE CASCADE,
  reviewer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES company_profiles(id) ON DELETE CASCADE,
  
  -- Overall rating (1-5)
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  
  -- Detailed ratings (1-5)
  quality_rating INTEGER CHECK (quality_rating >= 1 AND quality_rating <= 5),
  communication_rating INTEGER CHECK (communication_rating >= 1 AND communication_rating <= 5),
  timeliness_rating INTEGER CHECK (timeliness_rating >= 1 AND timeliness_rating <= 5),
  value_rating INTEGER CHECK (value_rating >= 1 AND value_rating <= 5),
  
  -- Review content
  review_text TEXT,
  images TEXT[], -- Array of image URLs
  
  -- Engagement metrics
  helpful_count INTEGER DEFAULT 0,
  
  -- Company response
  company_response TEXT,
  responded_at TIMESTAMP WITH TIME ZONE,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  UNIQUE(order_id, reviewer_id), -- One review per order per user
  CHECK (LENGTH(review_text) <= 5000)
);

-- Add helpful_votes table to track who marked reviews as helpful
CREATE TABLE IF NOT EXISTS review_helpful_votes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  review_id UUID NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(review_id, user_id) -- One vote per review per user
);

-- Enable RLS
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_helpful_votes ENABLE ROW LEVEL SECURITY;

-- RLS Policies for reviews
CREATE POLICY "Reviews are viewable by everyone"
  ON reviews FOR SELECT
  USING (true);

CREATE POLICY "Users can create reviews for orders they purchased"
  ON reviews FOR INSERT
  WITH CHECK (
    auth.uid() = reviewer_id AND
    EXISTS (
      SELECT 1 FROM product_orders
      WHERE id = order_id
      AND buyer_id = auth.uid()
      AND status = 'completed'
    )
  );

CREATE POLICY "Users can update their own reviews within 30 days"
  ON reviews FOR UPDATE
  USING (
    auth.uid() = reviewer_id AND
    created_at > NOW() - INTERVAL '30 days'
  );

CREATE POLICY "Companies can respond to their reviews"
  ON reviews FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM company_profiles
      WHERE id = company_id
      AND owner_id = auth.uid()
    )
  )
  WITH CHECK (
    company_response IS NOT NULL AND
    responded_at IS NOT NULL
  );

-- Admins can manage all reviews (moderation)
DROP POLICY IF EXISTS "Admins can manage all reviews" ON reviews;
CREATE POLICY "Admins can manage all reviews"
  ON reviews FOR ALL
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- RLS Policies for helpful votes
CREATE POLICY "Helpful votes are viewable by everyone"
  ON review_helpful_votes FOR SELECT
  USING (true);

CREATE POLICY "Users can mark reviews as helpful"
  ON review_helpful_votes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove their helpful votes"
  ON review_helpful_votes FOR DELETE
  USING (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_reviews_company_id ON reviews(company_id);
CREATE INDEX IF NOT EXISTS idx_reviews_order_id ON reviews(order_id);
CREATE INDEX IF NOT EXISTS idx_reviews_reviewer_id ON reviews(reviewer_id);
CREATE INDEX IF NOT EXISTS idx_reviews_rating ON reviews(rating);
CREATE INDEX IF NOT EXISTS idx_reviews_created_at ON reviews(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_review_helpful_votes_review_id ON review_helpful_votes(review_id);

-- Function to update helpful_count when votes change
CREATE OR REPLACE FUNCTION update_review_helpful_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE reviews
    SET helpful_count = helpful_count + 1
    WHERE id = NEW.review_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE reviews
    SET helpful_count = helpful_count - 1
    WHERE id = OLD.review_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update helpful_count
DROP TRIGGER IF EXISTS trigger_update_review_helpful_count ON review_helpful_votes;
CREATE TRIGGER trigger_update_review_helpful_count
  AFTER INSERT OR DELETE ON review_helpful_votes
  FOR EACH ROW
  EXECUTE FUNCTION update_review_helpful_count();

-- Function to update company average rating
CREATE OR REPLACE FUNCTION update_company_average_rating()
RETURNS TRIGGER AS $$
DECLARE
  avg_rating DECIMAL(3,2);
  review_count INTEGER;
BEGIN
  -- Calculate new average rating for the company
  SELECT 
    ROUND(AVG(rating)::NUMERIC, 2),
    COUNT(*)
  INTO avg_rating, review_count
  FROM reviews
  WHERE company_id = COALESCE(NEW.company_id, OLD.company_id);
  
  -- Update company profile
  UPDATE company_profiles
  SET 
    average_rating = avg_rating,
    total_reviews = review_count,
    updated_at = NOW()
  WHERE id = COALESCE(NEW.company_id, OLD.company_id);
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update company rating when review is created, updated, or deleted
DROP TRIGGER IF EXISTS trigger_update_company_rating ON reviews;
CREATE TRIGGER trigger_update_company_rating
  AFTER INSERT OR UPDATE OR DELETE ON reviews
  FOR EACH ROW
  EXECUTE FUNCTION update_company_average_rating();

-- Add rating fields to company_profiles if they don't exist
ALTER TABLE company_profiles 
  ADD COLUMN IF NOT EXISTS average_rating DECIMAL(3,2) DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS total_reviews INTEGER DEFAULT 0;

-- Create index for company ratings
CREATE INDEX IF NOT EXISTS idx_company_profiles_average_rating ON company_profiles(average_rating DESC);

-- Add comment to explain the schema
COMMENT ON TABLE reviews IS 'Customer reviews for completed orders';
COMMENT ON TABLE review_helpful_votes IS 'Tracks which users found reviews helpful';
COMMENT ON COLUMN reviews.rating IS 'Overall rating from 1-5 stars';
COMMENT ON COLUMN reviews.quality_rating IS 'Rating for quality of work (1-5)';
COMMENT ON COLUMN reviews.communication_rating IS 'Rating for communication (1-5)';
COMMENT ON COLUMN reviews.timeliness_rating IS 'Rating for timeliness (1-5)';
COMMENT ON COLUMN reviews.value_rating IS 'Rating for value for money (1-5)';
COMMENT ON COLUMN reviews.company_response IS 'Optional response from the company';
COMMENT ON COLUMN reviews.helpful_count IS 'Number of users who found this review helpful';
