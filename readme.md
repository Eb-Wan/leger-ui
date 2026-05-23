# Leger-UI frontend framework

> Don't use Leger-UI in production.

Leger-UI 4 (wip).

## Roadmap

- Limit re-renders

  - Basically, when building a big app with Leger-UI 3, I realized than in
    some cases, the app would trigger multiple renders. While this is an issue
    that could be fixed by writing better code. I want Leger-UI to be easy, so
    I will try to prevent these from happening.
- Better DOM updates

  - This one was really annoying, especially with forms.
    Consider the following DOM tree

  ```
      form/
      ├── input_a
      ├── input_b
      └── button
  ```

  If the user types something in the input_a, if the input_b or the button updates
  themselves, the entire form's HTML will be replaced, without triggering a render anywhere.
  Watever was in input_a will be lost.
- Better LGS
  Leger script (LGS), is hard to work with. The syntax is not great, it is missing some key features
  and doesn't make sense overall.

And all of these without making Leger-UI too heavy or complex, as ligtness is kind of the main goal
of Leger-UI.
