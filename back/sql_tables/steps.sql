CREATE TABLE steps(
    _id INT AUTO_INCREMENT PRIMARY KEY,
    recipe_id VARCHAR(36) , 
    step_number INT,
    step_instruction TEXT, 
    FOREIGN KEY (recipe_id) REFERENCES recipes (_id) ON DELETE CASCADE
)ENGINE=InnoDB;