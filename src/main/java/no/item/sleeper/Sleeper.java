package no.item.sleeper;

import com.enonic.xp.script.bean.BeanContext;
import com.enonic.xp.script.bean.ScriptBean;

public class Sleeper implements ScriptBean {

    @Override
    public void initialize(final BeanContext context) {}

    public void sleep(final long millis) {
        try {
            Thread.sleep(millis);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();       // preserve interrupt flag
            throw new RuntimeException(e);            // bubble up to JS as JavaException
        }
    }
}
