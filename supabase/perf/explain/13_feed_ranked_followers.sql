select * from public.feed_ranked_ids(
  p_viewer_id      => auth.uid(),
  p_followers_only => true,
  p_page_limit     => 21
)
