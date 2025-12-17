module MarkdownHelper
  def render_markdown(path)
    markdown = File.read(Rails.root.join("app/content/#{path}"))

    renderer = Redcarpet::Render::HTML.new(
      hard_wrap: true,
      filter_html: true
    )

    Redcarpet::Markdown
      .new(renderer, autolink: true, tables: true)
      .render(markdown)
      .html_safe
  end
end
