module NgWord
  extend ActiveSupport::Concern

  NG_PATTERNS = [
    %r{https?://}i,
    %r{www\.}i
  ].freeze

  def include_ng_word?(text)
    NG_PATTERNS.any? { |pattern| text.match?(pattern) }
  end
end
