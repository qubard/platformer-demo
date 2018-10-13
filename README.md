# platform-demo

A simple javascript platformer for demoing a basic collision-checking approach with terrain.

# Collisions

When an entity moves from a position A to position B we check for collisions using a raycast and check if a collision occurs by solving for the smallest `t` where the new entity's position intersects an object, otherwise move the player to position B. By using a quadtree or some other form of spatial partitioning the code can be made to be more performant as the number of collidable entities increases (in this case, platforms).