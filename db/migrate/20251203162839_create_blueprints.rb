class CreateBlueprints < ActiveRecord::Migration[7.2]
  def change
    create_table :blueprints do |t|
      t.references :post, null: false, foreign_key: true
      t.string :name, null: false
      t.jsonb :editor_state, null: false, default: {}

      t.timestamps
    end
  end
end
