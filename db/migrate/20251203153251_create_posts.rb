class CreatePosts < ActiveRecord::Migration[7.2]
  def change
    create_table :posts do |t|
      t.references :user, null: false, foreign_key: true
      t.string :title, null: false
      t.text :caption, null: false
      t.boolean :is_published, null: false, default: true

      t.timestamps
    end
    add_index :posts, :created_at

  end
end
