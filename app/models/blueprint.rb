# == Schema Information
#
# Table name: blueprints
#
#  id              :bigint           not null, primary key
#  dark_ink_color  :string           default("#222222"), not null
#  editor_state    :jsonb            not null
#  light_ink_color :string           default("#cc3333"), not null
#  name            :string           not null
#  paper_color     :string           default("#f8f0d8"), not null
#  created_at      :datetime         not null
#  updated_at      :datetime         not null
#  post_id         :bigint           not null
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

  HEX_COLOR_FORMAT = /\A#(?:[0-9a-fA-F]{3}){1,2}\z/

  validates :light_ink_color, format: { with: HEX_COLOR_FORMAT }
  validates :dark_ink_color,  format: { with: HEX_COLOR_FORMAT }
  validates :paper_color,     format: { with: HEX_COLOR_FORMAT }
end
