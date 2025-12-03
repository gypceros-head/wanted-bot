# == Schema Information
#
# Table name: blueprints
#
#  id           :bigint           not null, primary key
#  editor_state :jsonb            not null
#  name         :string           not null
#  created_at   :datetime         not null
#  updated_at   :datetime         not null
#  post_id      :bigint           not null
#
# Indexes
#
#  index_blueprints_on_post_id  (post_id)
#
# Foreign Keys
#
#  fk_rails_...  (post_id => posts.id)
#
class Blueprint < ApplicationRecord
  belongs_to :post

  has_many :assemblies, dependent: :destroy
  has_many :parts, through: :assemblies

  validates :name, presence: true
end
