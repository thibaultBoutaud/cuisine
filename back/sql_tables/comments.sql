CREATE TABLE comments(
    _id INT AUTO_INCREMENT PRIMARY KEY,
    recipe_id VARCHAR(36),
    user_id VARCHAR(36),
    comment TEXT,
    FOREIGN KEY (recipe_id) REFERENCES recipes (_id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users (_id) ON DELETE CASCADE
)ENGINE=InnoDB;