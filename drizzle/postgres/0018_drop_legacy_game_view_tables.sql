-- The old "game-view" home (pixel character + skill accessories) was replaced
-- by the bento dashboard. None of the legacy tables it backed are read by
-- any current code path; drop them.
DROP TABLE IF EXISTS "character_appearance";
DROP TABLE IF EXISTS "user_skills";
DROP TABLE IF EXISTS "skill_wishlist";
DROP TABLE IF EXISTS "wishlist_todos";
