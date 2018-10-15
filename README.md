# platform-demo

A simple pixel-perfect javascript platformer demo for showing a basic collision-checking approach with terrain.

# Collisions

When an entity moves from a position A to position B we check for collisions using a raycast and check if a collision occurs by solving for the smallest `t` where the new entity's position intersects an object, otherwise move the player to position B. By using a quadtree or some other form of spatial partitioning the code can be made to be more performant as the number of collidable entities increases (in this case, platforms).

# Notes

The player's velocity in the `y` direction should be 0 when on a platform. Bugs are introduced if the player is being "pushed down" while still on a platform, so instead check if the player is "in the air" by checking if they were to fall whether or not they would collide at some epsilon value.

When the player hits an object from the side, slide them along the object instead but do a collision scan upward before moving them along the same magnitude of the vector they were going in.