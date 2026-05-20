# Context

## Domain Terms

- **Wishlist**: a user's public list of desired items, including appearance settings and optional embedded widget settings.
- **Wishlist item**: an item inside a Wishlist. It may have price, currency, category, priority, URL, image, privacy, reservation, and widget visibility.
- **Wishlist owner**: the user who owns a Wishlist and can edit its items and settings.
- **Viewer**: the current signed-in or anonymous user looking at a Wishlist.
- **Mutual follower**: a Viewer and Wishlist owner who follow each other. Mutual followers can see private Wishlist items.
- **Wishlist appearance**: JSON-backed settings that control colors, banner/background display, fonts, item border style, and widget presentation.
- **Wishlist presentation**: the prepared view model for rendering a Wishlist page. It combines owner data, Viewer relationship, item query rules, resolved Wishlist appearance, and filter metadata.
- **Wishlist command context**: the server-side context for mutating a Wishlist. It provides the authenticated user id, ownership checks, owned Wishlist data, and shared command preconditions.
- **Wishlist item intake**: the process of turning a user's item draft, optional product metadata, category choice, and privacy settings into a valid Wishlist item command.
- **Wishlist settings state**: the normalized settings draft used by Appearance and Widget settings. It hides raw Wishlist appearance JSON defaults, theme mode rules, font choices, border choices, and widget layout settings.
- **Dashboard settings intake**: the authenticated server-side loading of the data needed by the settings page.
- **Wishlist filter state**: the normalized URL-backed state used to filter and sort Wishlist items. It owns category, currency, price range, sort order, and the query rules derived from those values.
