CREATE TABLE favorites(
    user_id VARCHAR(36),
    recipe_id VARCHAR(36),
    PRIMARY KEY (user_id, recipe_id),
    FOREIGN KEY (user_id) REFERENCES users (_id) ON DELETE CASCADE,
    FOREIGN KEY (recipe_id) REFERENCES recipes (_id) ON DELETE CASCADE 
)ENGINE=InnoDB;


