# jsRiffle Utils

## A set of tools that can be used to do helpful things with Exis that I build as I need them.

1. [Token Getter](#Token Getter)

### Token Getter

> Retrieve a token for a particular domain that you can use to join the fabric with. Tokens are good for 60 days.

```
//username and password is your Exis developer login
//domain is the domain for which the token should be valid
//name is the name you'd like to give the token for later retrieval/deletion
node token_getter.js -u username -p password -d domain -n name
```
