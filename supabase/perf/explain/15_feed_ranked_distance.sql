select * from public.feed_ranked_ids(p_viewer_id => auth.uid(), p_sort_order => 'distance', p_page_limit => 21)
