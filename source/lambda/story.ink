# title: The Mystery of Thorium Manor
# author: Chris Subagio 
# style: minimal
# ending: The End... ?
# assetRoot: some = https:\/\/somesite.com/

// this is a comment 
(!host:titleCard.jpg)
(! http:\/\/somesite.com/intro.ogg delay=5) Welcome to the (! "host:effects/magic.mp3" overlap=3) story. (!some:tada.ogg)

-> foyer

=== foyer 
(!whoosh.mp3)
You're standing in an impressive marble vestibule, clearly belonging to a wealthy manor. You cannot quite recall how you came to be here, but you're overcome with the need to leave. (!vo 0.mp3)

 * [option 1] 
    -> ballroom 
 * [option 2 (!vo 11.mp3)] 
    -> bower


=== ballroom 
(!music ballroom.mp3)
You enter a glistening ballroom crowned with a majestic chandelier. You thought the vestibule was grand, but this takes your breath away. (!vo 13.mp3)
    -> theEnd

=== bower 
Oh dear, you've stumbled into a lady's boudoir. Beautiful silks hang from the ceiling, and ornate pieces of furniture jostle for position along the elegantly painted walls.
    -> theEnd


=== theEnd 

- They lived happily ever after.
    -> END
